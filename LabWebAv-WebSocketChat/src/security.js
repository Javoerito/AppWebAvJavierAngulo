'use strict';

/**
 * Valida que el Origin de la petición pertenezca a un dominio permitido.
 * Sin cabecera Origin (curl, scripts, clientes no-navegador) => se rechaza.
 */
function isOriginAllowed(origin, allowedOrigins) {
  if (typeof origin !== 'string' || !origin) return false;
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false; // p. ej. Origin: "null"
  }
}

module.exports = { isOriginAllowed };
