// src/utils/passwordPolicy.js

// Devuelve null si la contraseña es válida.
// Si no, devuelve un string con el mensaje de error.
export const validatePasswordPolicy = (password) => {
  if (!password || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper) {
    return 'La contraseña debe incluir al menos una letra mayúscula.';
  }
  if (!hasLower) {
    return 'La contraseña debe incluir al menos una letra minúscula.';
  }
  if (!hasNumber) {
    return 'La contraseña debe incluir al menos un número.';
  }
  if (!hasSymbol) {
    return 'La contraseña debe incluir al menos un símbolo (ej: !@#$%).';
  }

  return null;
};

// Texto de ayuda resumido para mostrar en pantallas como
// registro o "olvidé mi contraseña".
export const passwordPolicySummary =
  'Mínimo 8 caracteres, con mayúsculas, minúsculas, número y símbolo.';

