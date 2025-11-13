const MIN_LENGTH = 10;

const baseRules = [
  {
    id: 'length',
    test: (value) => value.length >= MIN_LENGTH,
    message: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`,
  },
  {
    id: 'uppercase',
    test: (value) => /[A-Z]/.test(value),
    message: 'Incluye al menos una letra mayúscula.',
  },
  {
    id: 'lowercase',
    test: (value) => /[a-z]/.test(value),
    message: 'Incluye al menos una letra minúscula.',
  },
  {
    id: 'digit',
    test: (value) => /\d/.test(value),
    message: 'Incluye al menos un número.',
  },
  {
    id: 'special',
    test: (value) => /[^A-Za-z0-9]/.test(value),
    message: 'Incluye al menos un carácter especial.',
  },
  {
    id: 'no-spaces',
    test: (value) => !/\s/.test(value),
    message: 'No uses espacios en blanco.',
  },
  {
    id: 'no-repeated',
    test: (value) => !/(.)\1{2,}/.test(value),
    message: 'Evita repetir el mismo caracter 3 veces seguidas.',
  },
];

const cleanToken = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const PASSWORD_GUIDELINES = baseRules.map((rule) => rule.message);

export const validatePassword = (password, disallowList = []) => {
  const normalized = password ?? '';
  if (!normalized) {
    return { valid: false, message: 'La contraseña es requerida.' };
  }

  for (let index = 0; index < baseRules.length; index += 1) {
    const rule = baseRules[index];
    if (!rule.test(normalized)) {
      return { valid: false, message: rule.message };
    }
  }

  const passwordToken = cleanToken(normalized);
  if (!passwordToken.length) {
    return { valid: false, message: 'La contraseña debe incluir letras o números válidos.' };
  }

  const tokens = disallowList
    .map((item) => cleanToken(item))
    .filter((item) => item.length >= 3);

  if (tokens.some((token) => passwordToken.includes(token))) {
    return { valid: false, message: 'No incluyas tu nombre o correo dentro de la contraseña.' };
  }

  return { valid: true, message: '' };
};

export const passwordPolicySummary =
  'Minimo 10 caracteres, combina mayúsculas, minúsculas, números, símbolos y evita espacios o datos personales.';
