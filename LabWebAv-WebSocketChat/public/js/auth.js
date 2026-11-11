'use strict';

/**
 * Autenticación en el cliente con Firebase Authentication (email + contraseña).
 * La config de Firebase se pide al servidor (/api/config), que la lee del .env.
 * Tras iniciar sesión, el ID token de Firebase se intercambia por un JWT propio
 * (POST /api/auth/session) que es el que usa el WebSocket.
 */
(() => {
  const ERRORS = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/email-already-in-use': 'Ese correo ya está registrado. Inicia sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/operation-not-allowed': 'El acceso con correo y contraseña no está activado en Firebase.'
  };

  const ChatAuth = {
    auth: null,
    busy: false, // true mientras se registra: evita intercambiar un token sin nombre

    async init() {
      if (typeof firebase === 'undefined') throw new Error('No se pudo cargar Firebase. Revisa tu conexión.');
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar la configuración del servidor.');
      const { firebase: cfg } = await res.json();

      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      // Sesión por pestaña: permite probar dos cuentas en un mismo navegador
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    },

    onChange(callback) {
      this.auth.onAuthStateChanged(callback);
    },

    login(email, password) {
      return this.auth.signInWithEmailAndPassword(email, password);
    },

    async register(username, email, password) {
      const cred = await this.auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: username });
      await cred.user.getIdToken(true); // refresca para que el token incluya el nombre
      return cred;
    },

    logout() {
      return this.auth ? this.auth.signOut() : Promise.resolve();
    },

    /** Intercambia el ID token de Firebase por el JWT del servidor. */
    async fetchSession(forceRefresh = false) {
      const user = this.auth && this.auth.currentUser;
      if (!user) throw new Error('No hay sesión iniciada.');
      const idToken = await user.getIdToken(forceRefresh);

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar la sesión en el servidor.');
      return data; // { token, user:{uid, username} }
    },

    friendlyError(err) {
      return ERRORS[err && err.code] || (err && err.message) || 'Ocurrió un error. Inténtalo de nuevo.';
    }
  };

  window.ChatAuth = ChatAuth;
})();
