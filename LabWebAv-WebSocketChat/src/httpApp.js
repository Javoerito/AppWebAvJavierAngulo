'use strict';

const path = require('path');
const express = require('express');
const { isOriginAllowed } = require('./security');
const { sanitizeUsername } = require('./validation');

function createHttpApp({ config, authService }) {
  const app = express();
  app.disable('x-powered-by');

  // Config PÚBLICA de Firebase para el cliente (viene del .env, no está en el código)
  app.get('/api/config', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ firebase: config.firebaseWeb });
  });

  // Solo acepta peticiones POST originadas en un dominio permitido
  const originGuard = (req, res, next) => {
    if (!isOriginAllowed(req.headers.origin, config.allowedOrigins)) {
      return res.status(403).json({ error: 'Origen no permitido.' });
    }
    next();
  };

  // Intercambia un ID token de Firebase por un JWT propio
  app.post('/api/auth/session', originGuard, express.json({ limit: '10kb' }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const idToken = req.body && req.body.idToken;
    if (typeof idToken !== 'string' || !idToken) {
      return res.status(400).json({ error: 'Falta el token de Firebase.' });
    }
    try {
      const decoded = await authService.verifyFirebaseToken(idToken);
      const username = sanitizeUsername(decoded.name || String(decoded.email || '').split('@')[0]);
      const token = authService.signToken({ uid: decoded.uid, username });
      res.json({ token, user: { uid: decoded.uid, username } });
    } catch (err) {
      console.warn('[auth] ID token rechazado:', err.code || err.message);
      res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Errores (p. ej. JSON malformado)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.status || 400).json({ error: 'Petición inválida.' });
  });

  return app;
}

module.exports = { createHttpApp };
