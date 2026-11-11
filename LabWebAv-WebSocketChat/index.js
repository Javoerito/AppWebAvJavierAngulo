'use strict';

/**
 * WebChat en tiempo real
 * Node.js + Express + ws · Firebase Authentication + Firestore · JWT · .env
 * Arranque: npm start
 */

const http = require('http');
const os = require('os');
const { loadConfig } = require('./src/config');
const { initFirebase } = require('./src/firebase');
const { createAuthService } = require('./src/auth');
const { createMessageStore } = require('./src/messageStore');
const { createHttpApp } = require('./src/httpApp');
const { createChatServer } = require('./src/chatServer');

let config;
try {
  config = loadConfig(); // lee .env
} catch (err) {
  console.error(`\n${err.message}\n\nCopia .env.example a .env y complétalo.\n`);
  process.exit(1);
}

let firebase;
try {
  firebase = initFirebase(config);
} catch (err) {
  console.error(`\nNo se pudo iniciar Firebase Admin: ${err.message}\nRevisa las credenciales del .env.\n`);
  process.exit(1);
}

const authService = createAuthService({ firebaseAuth: firebase.auth, jwtConfig: config.jwt });
const store = createMessageStore({ db: firebase.db, collectionName: config.messagesCollection });
const app = createHttpApp({ config, authService });
const server = http.createServer(app);
const chat = createChatServer({ server, config, authService, store });

const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`WebChat listo en http://localhost:${config.port}`);
  console.log(`Orígenes permitidos: ${[...config.allowedOrigins].join(', ')}`);
  lanAddresses().forEach((ip) => console.log(`   Red local (agrégala a ALLOWED_ORIGINS): http://${ip}:${config.port}`));
});

function shutdown() {
  console.log('\nCerrando servidor...');
  chat.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
