'use strict';

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

/** Inicializa Firebase Admin (Authentication + Firestore) solo en el servidor. */
function initFirebase(config) {
  const { serviceAccountPath, projectId, clientEmail, privateKey } = config.firebaseAdmin;

  let credential;
  if (serviceAccountPath) {
    const file = path.resolve(serviceAccountPath);
    credential = cert(JSON.parse(fs.readFileSync(file, 'utf8')));
  } else {
    credential = cert({ projectId, clientEmail, privateKey });
  }

  const app = initializeApp({ credential, projectId });
  return { auth: getAuth(app), db: getFirestore(app) };
}

module.exports = { initFirebase };
