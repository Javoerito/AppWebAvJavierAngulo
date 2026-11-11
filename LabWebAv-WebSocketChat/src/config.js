'use strict';

const path = require('path');

/**
 * Lee TODA la configuración desde variables de entorno (archivo .env).
 * Si falta algo obligatorio, lanza un error con la lista completa.
 */
function loadConfig(env = process.env) {
  if (env === process.env) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  }

  const errors = [];
  const get = (name) => (env[name] || '').trim();
  const required = (name) => {
    const value = get(name);
    if (!value) errors.push(`Falta ${name}`);
    return value;
  };
  const int = (name, fallback) => {
    const n = parseInt(get(name), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  // --- JWT ---
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret && jwtSecret.length < 32) errors.push('JWT_SECRET debe tener al menos 32 caracteres');
  let jwtExpiresIn = get('JWT_EXPIRES_IN') || '1h';
  if (/^\d+$/.test(jwtExpiresIn)) jwtExpiresIn = Number(jwtExpiresIn); // número = segundos

  // --- Dominios permitidos (Origin) ---
  const allowedOrigins = new Set();
  for (const raw of get('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      allowedOrigins.add(new URL(raw).origin);
    } catch {
      errors.push(`ALLOWED_ORIGINS contiene un origen inválido: "${raw}"`);
    }
  }
  if (allowedOrigins.size === 0) errors.push('Falta ALLOWED_ORIGINS (ej: http://localhost:3000)');

  // --- Firebase (config pública del cliente web) ---
  const firebaseWeb = {
    apiKey: required('FIREBASE_API_KEY'),
    authDomain: required('FIREBASE_AUTH_DOMAIN'),
    projectId: required('FIREBASE_PROJECT_ID'),
    appId: required('FIREBASE_APP_ID')
  };
  if (get('FIREBASE_MESSAGING_SENDER_ID')) firebaseWeb.messagingSenderId = get('FIREBASE_MESSAGING_SENDER_ID');
  if (get('FIREBASE_STORAGE_BUCKET')) firebaseWeb.storageBucket = get('FIREBASE_STORAGE_BUCKET');

  // --- Firebase Admin (credenciales privadas del servidor) ---
  const serviceAccountPath = get('FIREBASE_SERVICE_ACCOUNT_PATH');
  const clientEmail = get('FIREBASE_CLIENT_EMAIL');
  const privateKey = get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  if (!serviceAccountPath && !(clientEmail && privateKey)) {
    errors.push('Define FIREBASE_SERVICE_ACCOUNT_PATH o bien FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
  }

  if (errors.length) {
    throw new Error(`Configuración incompleta en .env:\n  - ${errors.join('\n  - ')}`);
  }

  return {
    port: int('PORT', 3000),
    jwt: { secret: jwtSecret, expiresIn: jwtExpiresIn, issuer: 'webchat' },
    allowedOrigins,
    firebaseWeb,
    firebaseAdmin: {
      projectId: firebaseWeb.projectId,
      serviceAccountPath,
      clientEmail,
      privateKey
    },
    messagesCollection: get('FIRESTORE_MESSAGES_COLLECTION') || 'messages',
    historyLimit: Math.min(int('HISTORY_LIMIT', 50), 200)
  };
}

module.exports = { loadConfig };
