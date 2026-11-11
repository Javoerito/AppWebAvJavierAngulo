'use strict';

const jwt = require('jsonwebtoken');

/**
 * Autenticación:
 *  1) El cliente inicia sesión con Firebase Authentication y obtiene un ID token.
 *  2) El servidor verifica ese ID token (firebase-admin) y emite su PROPIO JWT.
 *  3) El WebSocket solo acepta ese JWT.
 */
function createAuthService({ firebaseAuth, jwtConfig }) {
  const { secret, expiresIn, issuer } = jwtConfig;

  return {
    verifyFirebaseToken(idToken) {
      return firebaseAuth.verifyIdToken(idToken);
    },

    signToken({ uid, username }) {
      return jwt.sign({ name: username }, secret, {
        algorithm: 'HS256',
        subject: uid,
        issuer,
        expiresIn
      });
    },

    /** Lanza JsonWebTokenError / TokenExpiredError si no es válido. */
    verifyToken(token) {
      if (typeof token !== 'string' || !token) throw new jwt.JsonWebTokenError('jwt must be provided');
      return jwt.verify(token, secret, { algorithms: ['HS256'], issuer });
    }
  };
}

module.exports = { createAuthService };
