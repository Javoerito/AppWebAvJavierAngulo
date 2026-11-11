'use strict';

const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 20;

function sanitizeUsername(raw, fallback = 'Usuario') {
  const clean = String(raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const value = Array.from(clean).slice(0, MAX_USERNAME_LENGTH).join('').trim();
  return value || fallback;
}

function validateText(raw) {
  if (typeof raw !== 'string') return { ok: false, code: 'invalid_text', message: 'El mensaje no es válido.' };
  const value = raw.trim();
  if (!value) return { ok: false, code: 'empty_message', message: 'No puedes enviar un mensaje vacío.' };
  if (value.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: 'message_too_long',
      message: `El mensaje supera los ${MAX_MESSAGE_LENGTH} caracteres (${value.length}). Acórtalo un poco.`
    };
  }
  return { ok: true, value };
}

module.exports = { MAX_MESSAGE_LENGTH, MAX_USERNAME_LENGTH, sanitizeUsername, validateText };
