# WebChat · Red Dark Premium

Node.js + Express + `ws` · Firebase Authentication · Firestore · JWT · `.env`

## Puesta en marcha

1. **Firebase Console** → crea un proyecto.
2. **Authentication → Método de acceso** → activa *Correo electrónico/contraseña*.
3. **Firestore Database** → crear base de datos. Reglas (el servidor usa Admin SDK, el cliente no accede directo):
   ```
   rules_version = '2';
   service cloud.firestore { match /databases/{db}/documents { match /{doc=**} { allow read, write: if false; } } }
   ```
4. **Configuración del proyecto → General → Tus apps → Web (`</>`)** → copia la config a `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`.
5. **Configuración → Cuentas de servicio → Generar nueva clave privada** → guarda el JSON como `serviceAccountKey.json` en la raíz.
6. Crea el `.env`:
   ```bash
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # pégalo en JWT_SECRET
   ```
7. Ejecuta:
   ```bash
   npm install
   npm start
   ```

## Flujo de seguridad

```
Cliente --(email+clave)--> Firebase Auth --> ID token
Cliente --POST /api/auth/session {idToken}--> Servidor verifica con firebase-admin --> JWT propio (HS256, expira)
Cliente --WebSocket /ws (Origin permitido)--> {type:"auth", token:JWT} --> welcome
```

- El WebSocket y `/api/auth/session` solo aceptan los orígenes de `ALLOWED_ORIGINS`.
- Sin `auth` válido en 5 s la conexión se cierra (4002); JWT inválido: 4003; JWT vencido: 4001 (el cliente renueva solo).
- Los mensajes se guardan en Firestore (colección `FIRESTORE_MESSAGES_COLLECTION`) y los últimos `HISTORY_LIMIT` se cargan al entrar.
- Identidad y hora de cada mensaje las pone el servidor.
