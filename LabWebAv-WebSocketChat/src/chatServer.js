'use strict';

/**
 * Servidor WebSocket del chat.
 *
 * Seguridad:
 *  - El handshake solo se acepta si el Origin está en ALLOWED_ORIGINS.
 *  - El primer mensaje DEBE ser {type:'auth', token:<JWT>}; sin él se cierra en 5 s.
 *  - El JWT se re-valida por expiración: al vencer se cierra con código 4001.
 *
 * Eventos cliente -> servidor: auth | chat | typing | leave
 * Eventos servidor -> cliente: welcome | auth_error | chat | user_joined |
 *                              user_left | typing | users_update | error
 *
 * Códigos de cierre: 4001 token vencido · 4002 sin autenticar a tiempo · 4003 no autorizado
 */

const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { isOriginAllowed } = require('./security');
const { validateText } = require('./validation');

const RECONNECT_GRACE_MS = 5000;
const AUTH_TIMEOUT_MS = 5000;
const HEARTBEAT_MS = 30000;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const RATE_WINDOW_MS = 5000;
const RATE_MAX_MESSAGES = 10;
const MAX_TIMER_MS = 2 ** 31 - 1;

function createChatServer({ server, config, authService, store, logger = console }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  /** uid -> { id, username, sockets:Set<ws>, graceTimer, queue:Promise, recent:number[] } */
  const users = new Map();

  // ------------------------------------------------------------------ envío
  const send = (ws, payload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const broadcast = (payload, exceptUserId = null) => {
    const data = JSON.stringify(payload);
    for (const user of users.values()) {
      if (user.id === exceptUserId) continue;
      for (const ws of user.sockets) if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  };

  const listUsers = () => Array.from(users.values()).map(({ id, username }) => ({ id, username }));
  const broadcastUsers = () => broadcast({ type: 'users_update', count: users.size, users: listUsers() });
  const sendError = (ws, code, message) => send(ws, { type: 'error', code, message });
  const closeWith = (ws, code, reason) => {
    try { ws.close(code, reason); } catch { /* ya cerrado */ }
  };

  // --------------------------------------------------------------- upgrade
  const rejectUpgrade = (socket, status, text) => {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    socket.destroy();
  };

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      return rejectUpgrade(socket, 400, 'Bad Request');
    }
    if (pathname !== '/ws') return rejectUpgrade(socket, 404, 'Not Found');

    if (!isOriginAllowed(req.headers.origin, config.allowedOrigins)) {
      logger.warn(`[ws] Origen rechazado: ${req.headers.origin || '(sin Origin)'}`);
      return rejectUpgrade(socket, 403, 'Forbidden');
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  // ------------------------------------------------------------- usuarios
  function removeUser(userId) {
    const user = users.get(userId);
    if (!user) return;
    clearTimeout(user.graceTimer);
    users.delete(userId);
    broadcast({ type: 'user_left', userId, username: user.username, timestamp: new Date().toISOString() });
    broadcastUsers();
  }

  async function handleAuth(ws, msg) {
    let payload;
    try {
      payload = authService.verifyToken(msg.token);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      send(ws, {
        type: 'auth_error',
        code: expired ? 'token_expired' : 'invalid_token',
        message: expired ? 'Tu sesión expiró.' : 'Token inválido. Inicia sesión de nuevo.'
      });
      return closeWith(ws, expired ? 4001 : 4003, expired ? 'token_expired' : 'invalid_token');
    }

    clearTimeout(ws.authTimer);
    ws.userId = payload.sub;

    // Cierra la conexión cuando venza el JWT
    const msLeft = Math.min(Math.max(payload.exp * 1000 - Date.now(), 0), MAX_TIMER_MS);
    ws.expiryTimer = setTimeout(() => {
      send(ws, { type: 'auth_error', code: 'token_expired', message: 'Tu sesión expiró.' });
      closeWith(ws, 4001, 'token_expired');
    }, msLeft);

    let user = users.get(payload.sub);
    const isNew = !user;
    if (isNew) {
      user = {
        id: payload.sub,
        username: payload.name,
        sockets: new Set(),
        graceTimer: null,
        queue: Promise.resolve(),
        recent: []
      };
      users.set(user.id, user);
    } else {
      clearTimeout(user.graceTimer); // reconexión o segunda pestaña: sin avisos duplicados
      user.graceTimer = null;
    }
    user.sockets.add(ws);

    if (isNew) {
      broadcast({ type: 'user_joined', userId: user.id, username: user.username, timestamp: new Date().toISOString() }, user.id);
      broadcastUsers();
    }

    let history = [];
    let historyFailed = false;
    try {
      history = await store.loadRecent(config.historyLimit);
    } catch (err) {
      historyFailed = true;
      logger.error('[firestore] No se pudo cargar el historial:', err.message);
    }

    send(ws, {
      type: 'welcome',
      userId: user.id,
      connectionId: ws.connectionId,
      username: user.username,
      reconnected: !isNew,
      history,
      count: users.size,
      users: listUsers()
    });
    if (historyFailed) sendError(ws, 'history_failed', 'No se pudo cargar el historial de mensajes.');
  }

  function isRateLimited(user) {
    const now = Date.now();
    user.recent = user.recent.filter((t) => now - t < RATE_WINDOW_MS);
    if (user.recent.length >= RATE_MAX_MESSAGES) return true;
    user.recent.push(now);
    return false;
  }

  function handleChat(ws, msg) {
    const user = users.get(ws.userId);
    if (!user) return;

    const check = validateText(msg.text);
    if (!check.ok) return sendError(ws, check.code, check.message);
    if (isRateLimited(user)) {
      return sendError(ws, 'rate_limited', 'Estás enviando mensajes muy rápido. Espera un momento.');
    }

    // Cola por usuario: conserva el orden de sus mensajes aunque Firestore tarde
    user.queue = user.queue.then(async () => {
      try {
        // Identidad y hora las pone el servidor, nunca el cliente
        const saved = await store.save({ userId: user.id, username: user.username, text: check.value });
        broadcast({
          type: 'chat',
          id: saved.id,
          userId: user.id,
          username: user.username,
          text: check.value,
          timestamp: saved.timestamp
        });
        broadcast({ type: 'typing', userId: user.id, username: user.username, isTyping: false }, user.id);
      } catch (err) {
        logger.error('[firestore] No se pudo guardar el mensaje:', err.message);
        sendError(ws, 'save_failed', 'No se pudo guardar tu mensaje. Inténtalo de nuevo.');
      }
    });
  }

  function handleTyping(ws, msg) {
    const user = users.get(ws.userId);
    if (!user) return;
    broadcast({ type: 'typing', userId: user.id, username: user.username, isTyping: msg.isTyping === true }, user.id);
  }

  function handleLeave(ws) {
    const userId = ws.userId;
    const user = users.get(userId);
    ws.userId = null;
    if (user) {
      user.sockets.delete(ws);
      if (user.sockets.size === 0) removeUser(userId); // salida inmediata (cierre de sesión)
    }
    closeWith(ws, 1000, 'leave');
  }

  function handleClose(ws) {
    clearTimeout(ws.authTimer);
    clearTimeout(ws.expiryTimer);
    const userId = ws.userId;
    if (!userId) return;
    const user = users.get(userId);
    if (!user) return;
    user.sockets.delete(ws);
    if (user.sockets.size === 0) {
      clearTimeout(user.graceTimer);
      user.graceTimer = setTimeout(() => removeUser(userId), RECONNECT_GRACE_MS);
    }
  }

  // ------------------------------------------------------------ conexiones
  wss.on('connection', (ws) => {
    ws.connectionId = crypto.randomUUID(); // identificador único por conexión
    ws.userId = null;
    ws.isAlive = true;
    ws.authTimer = setTimeout(() => closeWith(ws, 4002, 'auth_timeout'), AUTH_TIMEOUT_MS);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data, isBinary) => {
      if (isBinary) return sendError(ws, 'invalid_format', 'Formato de mensaje no soportado.');

      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return sendError(ws, 'invalid_json', 'El mensaje no tiene un formato JSON válido.');
      }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
        return sendError(ws, 'invalid_format', 'El mensaje no tiene un formato válido.');
      }

      // Sin autenticar: solo se admite 'auth'
      if (!ws.userId) {
        if (msg.type === 'auth') {
          return handleAuth(ws, msg).catch((err) => {
            logger.error('[ws] Error en autenticación:', err.message);
            closeWith(ws, 1011, 'server_error');
          });
        }
        send(ws, { type: 'auth_error', code: 'unauthorized', message: 'Debes iniciar sesión.' });
        return closeWith(ws, 4003, 'unauthorized');
      }

      switch (msg.type) {
        case 'chat': return handleChat(ws, msg);
        case 'typing': return handleTyping(ws, msg);
        case 'leave': return handleLeave(ws);
        case 'auth': return sendError(ws, 'already_authenticated', 'Ya estás autenticado.');
        default: return sendError(ws, 'unknown_type', 'Tipo de evento desconocido.');
      }
    });

    ws.on('close', () => handleClose(ws));
    ws.on('error', (err) => logger.error(`[ws ${ws.connectionId}]`, err.message));
  });

  wss.on('error', (err) => logger.error('[wss]', err.message));

  // Detecta conexiones muertas
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  function shutdown() {
    clearInterval(heartbeat);
    wss.clients.forEach((ws) => closeWith(ws, 1001, 'server_shutdown'));
    wss.close();
  }

  return { wss, users, shutdown };
}

module.exports = { createChatServer };
