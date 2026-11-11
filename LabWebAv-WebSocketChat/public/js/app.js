'use strict';

/**
 * WebChat · cliente
 * Módulos: Config, Storage, Dom, Theme, Toast, ConnectionUI, Utils, UsersUI,
 *          MessagesUI, Typing, Socket (JWT), Login, AuthFlow (Firebase), Composer, Sidebar
 * Seguridad: todo texto de usuarios se inserta con textContent (nunca innerHTML).
 * Autenticación: Firebase Authentication -> JWT propio -> mensaje 'auth' del WebSocket.
 */
(() => {
  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------
  const Config = {
    MAX_MESSAGE_LENGTH: 500,
    MAX_USERNAME_LENGTH: 20,
    TYPING_SEND_INTERVAL: 2000,   // reenvío de "está escribiendo" mientras se teclea
    TYPING_IDLE_MS: 2500,         // inactividad para dejar de "escribir"
    REMOTE_TYPING_TTL: 4000,      // caducidad local del aviso de otro usuario
    RECONNECT_BASE_MS: 1000,
    RECONNECT_MAX_MS: 10000,
    TOAST_MS: 3800,
    MAX_TOASTS: 4,
    THEME_KEY: 'webchat-theme',
    CLOSE_TOKEN_EXPIRED: 4001,    // el JWT venció
    CLOSE_UNAUTHORIZED: 4003      // JWT inválido o sin autenticar
  };

  // -------------------------------------------------------------------------
  // Storage (localStorage para la preferencia de tema)
  // -------------------------------------------------------------------------
  const Storage = {
    get(store, key) {
      try { return store.getItem(key); } catch { return null; }
    },
    set(store, key, value) {
      try { store.setItem(key, value); } catch { /* almacenamiento no disponible */ }
    }
  };

  // -------------------------------------------------------------------------
  // Dom
  // -------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const Dom = {
    root: document.documentElement,
    loginScreen: $('login-screen'),
    loginForm: $('login-form'),
    loginInput: $('username-input'),
    emailInput: $('email-input'),
    passwordInput: $('password-input'),
    fieldUsername: $('field-username'),
    tabLogin: $('tab-login'),
    tabRegister: $('tab-register'),
    loginError: $('login-error'),
    loginBtn: $('login-btn'),
    logoutBtn: $('logout-btn'),
    sidebar: $('sidebar'),
    sidebarClose: $('sidebar-close'),
    sidebarBackdrop: $('sidebar-backdrop'),
    sidebarCount: $('sidebar-count'),
    userList: $('user-list'),
    menuBtn: $('menu-btn'),
    themeToggle: $('theme-toggle'),
    connStatus: $('conn-status'),
    connLabel: $('conn-label'),
    onlineCount: $('online-count'),
    messages: $('messages'),
    emptyState: $('empty-state'),
    typingBox: $('typing-indicator'),
    typingText: $('typing-text'),
    composer: $('composer'),
    composerField: $('composer-field'),
    input: $('message-input'),
    sendBtn: $('send-btn'),
    counter: $('char-counter'),
    toasts: $('toasts')
  };

  // -------------------------------------------------------------------------
  // Estado de la aplicación
  // -------------------------------------------------------------------------
  const State = {
    userId: null,
    username: null,
    joined: false,
    hasConnectedBefore: false,
    outage: false
  };

  // -------------------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------------------
  const Utils = {
    timeFmt: new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
    longDateFmt: new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),

    initials(name) {
      const words = String(name || '?').trim().split(/\s+/).filter(Boolean);
      const chars = words.length > 1
        ? [Array.from(words[0])[0], Array.from(words[1])[0]]
        : Array.from(words[0] || '?').slice(0, 2);
      return chars.join('').toUpperCase();
    },

    avatarVariant(seed) {
      let hash = 0;
      for (const ch of String(seed)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
      return hash % 6;
    },

    createAvatar(name, seed) {
      const el = document.createElement('div');
      el.className = `avatar avatar--v${this.avatarVariant(seed || name)}`;
      el.textContent = this.initials(name);
      el.setAttribute('aria-hidden', 'true');
      return el;
    },

    parseDate(value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? new Date() : d;
    },

    dateKey(d) {
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    },

    dateLabel(d) {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (this.dateKey(d) === this.dateKey(now)) return 'Hoy';
      if (this.dateKey(d) === this.dateKey(yesterday)) return 'Ayer';
      const text = this.longDateFmt.format(d);
      return text.charAt(0).toUpperCase() + text.slice(1);
    },

    // Misma regla que el servidor: se valida el texto recortado
    validateText(raw) {
      const text = String(raw || '').trim();
      if (!text) return { ok: false, message: 'No puedes enviar un mensaje vacío.' };
      if (text.length > Config.MAX_MESSAGE_LENGTH) {
        return {
          ok: false,
          message: `Tu mensaje supera los ${Config.MAX_MESSAGE_LENGTH} caracteres (${text.length}). Acórtalo un poco.`
        };
      }
      return { ok: true, text };
    },

    validateUsername(raw) {
      const name = String(raw || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
      if (!name) return { ok: false, message: 'Escribe un nombre de usuario.' };
      if (Array.from(name).length > Config.MAX_USERNAME_LENGTH) {
        return { ok: false, message: `Máximo ${Config.MAX_USERNAME_LENGTH} caracteres.` };
      }
      return { ok: true, name };
    }
  };

  // -------------------------------------------------------------------------
  // Theme (modo claro / oscuro persistente)
  // -------------------------------------------------------------------------
  const Theme = {
    current: 'dark',
    init() {
      const saved = Storage.get(localStorage, Config.THEME_KEY);
      this.apply(saved === 'light' ? 'light' : 'dark');
      Dom.themeToggle.addEventListener('click', () => this.toggle());
    },
    apply(theme) {
      this.current = theme;
      Dom.root.setAttribute('data-theme', theme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F4F6' : '#0B0B0F');
    },
    toggle() {
      const next = this.current === 'dark' ? 'light' : 'dark';
      Dom.root.classList.add('theme-transition');
      this.apply(next);
      Storage.set(localStorage, Config.THEME_KEY, next);
      setTimeout(() => Dom.root.classList.remove('theme-transition'), 450);
    }
  };

  // -------------------------------------------------------------------------
  // Toast (notificaciones del sistema con animación de entrada y salida)
  // -------------------------------------------------------------------------
  const Toast = {
    show(text, kind = 'info', duration = Config.TOAST_MS) {
      while (Dom.toasts.children.length >= Config.MAX_TOASTS) this.remove(Dom.toasts.firstElementChild, true);

      const el = document.createElement('div');
      el.className = `toast toast--${kind}`;
      el.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');
      el.textContent = text;
      Dom.toasts.appendChild(el);

      el._timer = setTimeout(() => this.remove(el), duration);
      return el;
    },
    remove(el, immediate = false) {
      if (!el || !el.parentNode) return;
      clearTimeout(el._timer);
      if (immediate) { el.remove(); return; }
      el.classList.add('is-leaving');
      const done = () => el.remove();
      el.addEventListener('animationend', done, { once: true });
      setTimeout(done, 500); // respaldo
    }
  };

  // -------------------------------------------------------------------------
  // ConnectionUI (indicador: conectado / desconectado / reconectando)
  // -------------------------------------------------------------------------
  const ConnectionUI = {
    labels: { connected: 'Conectado', disconnected: 'Desconectado', reconnecting: 'Reconectando…' },
    set(state, customLabel) {
      Dom.connStatus.setAttribute('data-state', state);
      Dom.connLabel.textContent = customLabel || this.labels[state];
    }
  };

  // -------------------------------------------------------------------------
  // UsersUI (panel lateral + contadores)
  // -------------------------------------------------------------------------
  const UsersUI = {
    knownIds: new Set(),
    render(users, count) {
      const list = Array.isArray(users) ? users : [];
      const total = Number.isFinite(count) ? count : list.length;

      const sorted = [...list].sort((a, b) => {
        if (a.id === State.userId) return -1;
        if (b.id === State.userId) return 1;
        return String(a.username).localeCompare(String(b.username), 'es');
      });

      const frag = document.createDocumentFragment();
      const nextIds = new Set();

      for (const user of sorted) {
        nextIds.add(user.id);
        const li = document.createElement('li');
        li.className = 'user-item';
        if (!this.knownIds.has(user.id)) li.classList.add('is-new');

        const info = document.createElement('div');
        info.className = 'user-item__info';
        const name = document.createElement('span');
        name.className = 'user-item__name';
        name.textContent = user.username;
        info.appendChild(name);
        if (user.id === State.userId) {
          const tag = document.createElement('span');
          tag.className = 'user-item__tag';
          tag.textContent = 'Tú';
          info.appendChild(tag);
        }

        const dot = document.createElement('span');
        dot.className = 'user-item__dot';
        dot.setAttribute('title', 'En línea');

        li.append(Utils.createAvatar(user.username, user.id), info, dot);
        frag.appendChild(li);
      }

      Dom.userList.replaceChildren(frag);
      this.knownIds = nextIds;
      Dom.sidebarCount.textContent = String(total);
      Dom.onlineCount.textContent = `${total} en línea`;
    }
  };

  // -------------------------------------------------------------------------
  // MessagesUI (burbujas, separadores de fecha, estado vacío)
  // -------------------------------------------------------------------------
  const MessagesUI = {
    renderedIds: new Set(),
    lastDateKey: null,

    clear() {
      Dom.messages.replaceChildren();
      this.renderedIds.clear();
      this.lastDateKey = null;
      this.updateEmpty();
    },

    updateEmpty() {
      Dom.emptyState.hidden = Boolean(Dom.messages.querySelector('.message'));
    },

    nearBottom() {
      const m = Dom.messages;
      return m.scrollHeight - m.scrollTop - m.clientHeight < 140;
    },

    scrollToBottom(smooth = true) {
      Dom.messages.scrollTo({ top: Dom.messages.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    },

    add(msg, { animate = true } = {}) {
      if (!msg || typeof msg.text !== 'string') return;
      if (msg.id) {
        if (this.renderedIds.has(msg.id)) return; // evita duplicados
        this.renderedIds.add(msg.id);
      }

      const isOwn = msg.userId === State.userId;
      const wasNearBottom = this.nearBottom();
      const date = Utils.parseDate(msg.timestamp);

      // Separador de fecha
      const key = Utils.dateKey(date);
      if (key !== this.lastDateKey) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        const label = document.createElement('span');
        label.textContent = Utils.dateLabel(date);
        sep.appendChild(label);
        Dom.messages.appendChild(sep);
        this.lastDateKey = key;
      }

      // Mensaje
      const row = document.createElement('article');
      row.className = `message ${isOwn ? 'message--own' : 'message--other'}`;
      if (!animate) row.classList.add('no-anim');

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      if (!isOwn) {
        const author = document.createElement('span');
        author.className = 'bubble__author';
        author.textContent = String(msg.username || 'Anónimo');
        bubble.appendChild(author);
      }

      const text = document.createElement('p');
      text.className = 'bubble__text';
      text.textContent = msg.text;

      const time = document.createElement('time');
      time.className = 'bubble__time';
      time.dateTime = date.toISOString();
      time.textContent = Utils.timeFmt.format(date);

      bubble.append(text, time);

      if (!isOwn) row.appendChild(Utils.createAvatar(msg.username, msg.userId));
      row.appendChild(bubble);

      Dom.messages.appendChild(row);
      this.updateEmpty();

      if (isOwn || wasNearBottom) this.scrollToBottom(animate);
    }
  };

  // -------------------------------------------------------------------------
  // Typing (indicador de escritura, local y remoto)
  // -------------------------------------------------------------------------
  const Typing = {
    // --- Local: lo que yo envío ---
    active: false,
    lastSent: 0,
    idleTimer: null,

    onInput(hasText) {
      if (!hasText) return this.stop();
      const now = Date.now();
      if (!this.active || now - this.lastSent > Config.TYPING_SEND_INTERVAL) {
        Socket.send({ type: 'typing', isTyping: true });
        this.lastSent = now;
      }
      this.active = true;
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.stop(), Config.TYPING_IDLE_MS);
    },

    stop() {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
      if (this.active) {
        Socket.send({ type: 'typing', isTyping: false });
        this.active = false;
      }
    },

    resetLocal() {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
      this.active = false;
    },

    // --- Remoto: lo que escriben otros ---
    remote: new Map(), // userId -> { username, timer }

    setRemote(userId, username, isTyping) {
      const prev = this.remote.get(userId);
      if (prev) clearTimeout(prev.timer);

      if (isTyping) {
        const timer = setTimeout(() => {
          this.remote.delete(userId);
          this.render();
        }, Config.REMOTE_TYPING_TTL);
        this.remote.set(userId, { username, timer });
      } else {
        this.remote.delete(userId);
      }
      this.render();
    },

    clearRemote(userId) {
      const prev = this.remote.get(userId);
      if (!prev) return;
      clearTimeout(prev.timer);
      this.remote.delete(userId);
      this.render();
    },

    clearAllRemote() {
      for (const { timer } of this.remote.values()) clearTimeout(timer);
      this.remote.clear();
      this.render();
    },

    render() {
      const names = [...this.remote.values()].map((e) => e.username);
      if (names.length === 0) {
        Dom.typingBox.classList.remove('is-visible');
        return;
      }
      let text;
      if (names.length === 1) text = `${names[0]} está escribiendo...`;
      else if (names.length === 2) text = `${names[0]} y ${names[1]} están escribiendo...`;
      else text = 'Varios usuarios están escribiendo...';
      Dom.typingText.textContent = text;
      Dom.typingBox.classList.add('is-visible');
    }
  };

  // -------------------------------------------------------------------------
  // Socket (conexión real, JWT, reconexión con backoff, eventos JSON)
  // -------------------------------------------------------------------------
  const Socket = {
    ws: null,
    token: null,          // JWT emitido por el servidor
    attempts: 0,
    reconnectTimer: null,
    manual: false,        // true cuando se cierra a propósito (cerrar sesión)
    lastAuthError: null,
    lastRefresh: 0,

    url() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${location.host}/ws`;
    },

    setToken(token) {
      this.token = token;
    },

    isOpen() {
      return Boolean(this.ws) && this.ws.readyState === WebSocket.OPEN;
    },

    isReady() {
      return this.isOpen() && State.joined;
    },

    connect() {
      if (!this.token) return;
      this.manual = false;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

      ConnectionUI.set('reconnecting', State.hasConnectedBefore ? 'Reconectando…' : 'Conectando…');

      let socket;
      try {
        socket = new WebSocket(this.url());
      } catch {
        this.scheduleReconnect();
        return;
      }
      this.ws = socket;

      socket.addEventListener('open', () => {
        if (socket !== this.ws) return;
        this.attempts = 0;
        State.hasConnectedBefore = true;
        ConnectionUI.set('connected');
        this.send({ type: 'auth', token: this.token }); // el JWT se valida en el servidor
      });

      socket.addEventListener('message', (event) => {
        if (socket !== this.ws) return;
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data && typeof data === 'object') this.handle(data);
      });

      socket.addEventListener('error', () => { /* el cierre se gestiona en 'close' */ });

      socket.addEventListener('close', (event) => {
        if (socket !== this.ws) return;
        this.ws = null;
        this.onClosed(event);
      });
    },

    /** Cierre intencional (cerrar sesión): no se reconecta. */
    disconnect() {
      this.manual = true;
      this.token = null;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      const socket = this.ws;
      this.ws = null;
      if (socket) { try { socket.close(1000, 'logout'); } catch { /* noop */ } }
      State.joined = false;
      Typing.resetLocal();
      Typing.clearAllRemote();
      ConnectionUI.set('disconnected');
    },

    onClosed(event) {
      State.joined = false;
      Typing.resetLocal();
      Typing.clearAllRemote();
      if (this.manual) return;

      const code = event && event.code;

      if (code === Config.CLOSE_TOKEN_EXPIRED) {
        // JWT vencido: se pide uno nuevo con la sesión de Firebase y se reconecta
        ConnectionUI.set('reconnecting');
        AuthFlow.refresh().then((ok) => {
          if (ok) this.connect();
          else AuthFlow.forceLogout('Tu sesión expiró. Inicia sesión de nuevo.');
        });
        return;
      }

      if (code === Config.CLOSE_UNAUTHORIZED) {
        AuthFlow.forceLogout((this.lastAuthError && this.lastAuthError.message) || 'No se pudo autenticar tu sesión.');
        return;
      }

      if (State.hasConnectedBefore && !State.outage) {
        State.outage = true;
        Toast.show('Conexión perdida. Intentando reconectar…', 'warning');
      }
      ConnectionUI.set('disconnected');
      this.scheduleReconnect();
    },

    scheduleReconnect() {
      clearTimeout(this.reconnectTimer);
      const delay = Math.min(Config.RECONNECT_BASE_MS * 2 ** this.attempts, Config.RECONNECT_MAX_MS);
      this.attempts += 1;
      this.reconnectTimer = setTimeout(() => this.connect(), delay + Math.random() * 300);
    },

    reconnectNow() {
      if (!this.token || this.manual) return;
      if (this.isOpen() || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) return;
      this.attempts = 0;
      this.connect();
    },

    send(payload) {
      if (!this.isOpen()) return false;
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    },

    handle(data) {
      // Hasta recibir 'welcome' solo se atienden los eventos de autenticación
      if (!State.joined && !['welcome', 'auth_error', 'error'].includes(data.type)) return;

      switch (data.type) {
        case 'welcome': return this.onWelcome(data);
        case 'auth_error': this.lastAuthError = data; return;
        case 'chat': return this.onChat(data);
        case 'user_joined':
          return Toast.show(`${data.username} se unió al chat`, 'success');
        case 'user_left':
          Typing.clearRemote(data.userId);
          return Toast.show(`${data.username} salió del chat`, 'info');
        case 'users_update': return UsersUI.render(data.users, data.count);
        case 'typing':
          if (data.userId === State.userId) return;
          return Typing.setRemote(data.userId, data.username, data.isTyping === true);
        case 'error': return this.onServerError(data);
        default: return;
      }
    },

    onWelcome(data) {
      State.userId = data.userId;
      State.username = data.username;
      State.joined = true;

      MessagesUI.clear();
      (Array.isArray(data.history) ? data.history : []).forEach((m) => MessagesUI.add(m, { animate: false }));
      MessagesUI.scrollToBottom(false);

      UsersUI.knownIds = new Set();
      UsersUI.render(data.users, data.count);

      Login.hide();
      if (State.outage) {
        State.outage = false;
        Toast.show('Conexión restablecida', 'success');
      }
      Dom.input.focus({ preventScroll: true });
    },

    onChat(data) {
      MessagesUI.add(data);
      Typing.clearRemote(data.userId);
    },

    onServerError(data) {
      Toast.show(data.message || 'Ocurrió un error.', 'warning');
    }
  };

  // -------------------------------------------------------------------------
  // Login (correo y contraseña con Firebase Authentication)
  // -------------------------------------------------------------------------
  const Login = {
    mode: 'login',

    init() {
      Dom.tabLogin.addEventListener('click', () => this.setMode('login'));
      Dom.tabRegister.addEventListener('click', () => this.setMode('register'));
      Dom.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });
    },

    setMode(mode) {
      this.mode = mode;
      const isRegister = mode === 'register';
      Dom.tabLogin.classList.toggle('is-active', !isRegister);
      Dom.tabRegister.classList.toggle('is-active', isRegister);
      Dom.tabLogin.setAttribute('aria-selected', String(!isRegister));
      Dom.tabRegister.setAttribute('aria-selected', String(isRegister));
      Dom.fieldUsername.hidden = !isRegister;
      Dom.passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
      Dom.loginBtn.textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
      this.showError('');
    },

    showError(message, info = false) {
      Dom.loginError.textContent = message;
      Dom.loginError.classList.toggle('is-info', info);
    },

    setBusy(busy, text = '') {
      Dom.loginBtn.disabled = busy;
      if (busy && text) this.showError(text, true);
    },

    async submit() {
      const email = Dom.emailInput.value.trim();
      const password = Dom.passwordInput.value;
      const isRegister = this.mode === 'register';

      if (!email || !password) return this.showError('Escribe tu correo y tu contraseña.');

      let username = '';
      if (isRegister) {
        const check = Utils.validateUsername(Dom.loginInput.value);
        if (!check.ok) return this.showError(check.message);
        if (Array.from(check.name).length < 2) return this.showError('El nombre debe tener al menos 2 caracteres.');
        if (password.length < 6) return this.showError('La contraseña debe tener al menos 6 caracteres.');
        username = check.name;
      }

      this.setBusy(true, isRegister ? 'Creando tu cuenta…' : 'Verificando tus datos…');
      try {
        if (isRegister) {
          ChatAuth.busy = true; // evita que onAuthStateChanged use un token sin nombre
          await ChatAuth.register(username, email, password);
          ChatAuth.busy = false;
          await AuthFlow.onSignedIn();
        } else {
          await ChatAuth.login(email, password); // onAuthStateChanged continúa el flujo
        }
      } catch (err) {
        ChatAuth.busy = false;
        this.setBusy(false);
        this.showError(ChatAuth.friendlyError(err));
      }
    },

    show(message = '') {
      this.setBusy(false);
      this.showError(message);
      Dom.loginScreen.classList.remove('is-hidden');
      (Dom.emailInput.value ? Dom.passwordInput : Dom.emailInput).focus({ preventScroll: true });
    },

    hide() {
      Dom.loginScreen.classList.add('is-hidden');
      Dom.passwordInput.value = '';
      this.setBusy(false);
      this.showError('');
    }
  };

  // -------------------------------------------------------------------------
  // AuthFlow (Firebase -> JWT propio -> WebSocket)
  // -------------------------------------------------------------------------
  const AuthFlow = {
    async startSession(forceRefresh = false) {
      const { token } = await ChatAuth.fetchSession(forceRefresh);
      Socket.setToken(token);
    },

    async onSignedIn() {
      Login.setBusy(true, 'Conectando con el chat…');
      try {
        await this.startSession();
        Socket.connect();
      } catch (err) {
        await ChatAuth.logout().catch(() => {});
        Login.show(ChatAuth.friendlyError(err));
      }
    },

    /** Pide un JWT nuevo (p. ej. cuando venció). Evita bucles si falla repetidamente. */
    async refresh() {
      if (Date.now() - Socket.lastRefresh < 5000) return false;
      Socket.lastRefresh = Date.now();
      try {
        await this.startSession(true);
        return true;
      } catch {
        return false;
      }
    },

    resetUI() {
      State.userId = null;
      State.username = null;
      State.joined = false;
      State.outage = false;
      MessagesUI.clear();
      UsersUI.knownIds = new Set();
      UsersUI.render([], 0);
      Dom.input.value = '';
      Composer.autosize();
      Composer.updateCounter();
    },

    async logout() {
      Socket.send({ type: 'leave' }); // el servidor avisa la salida de inmediato
      Socket.disconnect();
      await ChatAuth.logout().catch(() => {});
      this.resetUI();
      Login.show();
    },

    async forceLogout(message) {
      Socket.disconnect();
      await ChatAuth.logout().catch(() => {});
      this.resetUI();
      Login.show(message);
    }
  };

  // -------------------------------------------------------------------------
  // Composer (envío, contador, validación)
  // -------------------------------------------------------------------------
  const Composer = {
    init() {
      Dom.composer.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });

      Dom.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          this.submit();
        }
      });

      Dom.input.addEventListener('input', () => {
        this.autosize();
        this.updateCounter();
        Typing.onInput(Dom.input.value.trim().length > 0);
      });

      Dom.input.addEventListener('blur', () => Typing.stop());
    },

    autosize() {
      Dom.input.style.height = 'auto';
      Dom.input.style.height = `${Math.min(Dom.input.scrollHeight, 140)}px`;
    },

    updateCounter() {
      const len = Dom.input.value.trim().length;
      Dom.counter.textContent = `${len}/${Config.MAX_MESSAGE_LENGTH}`;
      Dom.counter.classList.toggle('is-over', len > Config.MAX_MESSAGE_LENGTH);
      Dom.counter.classList.toggle('is-warning', len > Config.MAX_MESSAGE_LENGTH * 0.9 && len <= Config.MAX_MESSAGE_LENGTH);
      Dom.sendBtn.classList.toggle('is-ready', len > 0 && len <= Config.MAX_MESSAGE_LENGTH);
    },

    flagInvalid() {
      Dom.composerField.classList.remove('is-invalid');
      void Dom.composerField.offsetWidth; // reinicia la animación
      Dom.composerField.classList.add('is-invalid');
      setTimeout(() => Dom.composerField.classList.remove('is-invalid'), 600);
    },

    submit() {
      const check = Utils.validateText(Dom.input.value);
      if (!check.ok) {
        Toast.show(check.message, 'warning');
        this.flagInvalid();
        Dom.input.focus();
        return;
      }

      if (!Socket.isReady()) {
        Toast.show('Sin conexión con el servidor. Tu mensaje no se envió; se está reintentando conectar.', 'warning');
        return;
      }

      const sent = Socket.send({
        type: 'chat',
        username: State.username,
        text: check.text,
        timestamp: new Date().toISOString()
      });
      if (!sent) {
        Toast.show('No se pudo enviar el mensaje. Inténtalo de nuevo.', 'error');
        return;
      }

      Typing.stop();
      Dom.input.value = '';
      this.autosize();
      this.updateCounter();
      Dom.input.focus();

      Dom.sendBtn.classList.remove('is-sent');
      void Dom.sendBtn.offsetWidth;
      Dom.sendBtn.classList.add('is-sent');
    }
  };

  // -------------------------------------------------------------------------
  // Sidebar (menú desplegable en pantallas pequeñas)
  // -------------------------------------------------------------------------
  const Sidebar = {
    init() {
      Dom.menuBtn.addEventListener('click', () => this.toggle(true));
      Dom.sidebarClose.addEventListener('click', () => this.toggle(false));
      Dom.sidebarBackdrop.addEventListener('click', () => this.toggle(false));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.toggle(false); });
      window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) this.toggle(false); });
    },
    toggle(open) {
      Dom.sidebar.classList.toggle('is-open', open);
      Dom.sidebarBackdrop.classList.toggle('is-visible', open);
      Dom.menuBtn.setAttribute('aria-expanded', String(open));
    }
  };

  // -------------------------------------------------------------------------
  // Arranque
  // -------------------------------------------------------------------------
  async function init() {
    Theme.init();
    Login.init();
    Composer.init();
    Sidebar.init();
    MessagesUI.updateEmpty();
    Composer.updateCounter();

    Dom.logoutBtn.addEventListener('click', () => AuthFlow.logout());
    window.addEventListener('online', () => Socket.reconnectNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') Socket.reconnectNow();
    });

    ConnectionUI.set('disconnected');
    Login.setBusy(true, 'Cargando…');

    try {
      await ChatAuth.init();
    } catch (err) {
      Login.show(err.message);
      Login.setBusy(true); // sin Firebase no se puede iniciar sesión
      return;
    }

    Login.setBusy(false);
    Login.showError('');

    // Fuente de verdad de la sesión: Firebase Authentication
    ChatAuth.onChange((user) => {
      if (ChatAuth.busy) return;
      if (user) {
        AuthFlow.onSignedIn();
      } else {
        Socket.disconnect();
        AuthFlow.resetUI();
        Login.show();
      }
    });
  }

  init();
})();
