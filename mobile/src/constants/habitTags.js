const normalizeBase = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '');
};

export const HABIT_TAGS = [
  {
    value: 'movement',
    label: 'Movimiento consciente',
    description: 'Caminata, yoga, estiramientos o baile suave.',
    aliases: ['movimiento', 'actividadfisica'],
  },
  {
    value: 'nutrition',
    label: 'Alimentación nutritiva',
    description: 'Plato balanceado o hidratacion adecuada.',
    aliases: ['alimentacion', 'nutricion'],
  },
  {
    value: 'mindfulness',
    label: 'Mindfulness o respiración',
    description: 'Meditación breve, respiraciones o pausa consciente.',
    aliases: ['mindfulness', 'respiracion'],
  },
  {
    value: 'gratitude',
    label: 'Gratitud o reflexión',
    description: 'Registrar logros, agradecimientos o aprendizajes.',
    aliases: ['gratitud', 'reflexión'],
  },
  {
    value: 'connection',
    label: 'Conexion social',
    description: 'Conversación significativa o compartir apoyo.',
    aliases: ['social', 'compañías'],
  },
  {
    value: 'rest',
    label: 'Descanso reparador',
    description: 'Siesta, pausa consciente o dormir a tiempo.',
    aliases: ['descanso'],
  },
  {
    value: 'digital_break',
    label: 'Pausa digital',
    description: 'Tiempo sin pantallas, redes o notificaciones.',
    aliases: ['pausadigital', 'detoxdigital'],
  },
  {
    value: 'creativity',
    label: 'Actividad creativa o foco',
    description: 'Arte, música, escritura o progreso personal.',
    aliases: ['creatividad', 'trabajo', 'productividad'],
  },
  {
    value: 'outdoors',
    label: 'Contacto con la naturaleza',
    description: 'Jardinería, paseo o respirar aire libre.',
    aliases: ['naturaleza', 'exterior'],
  },
  {
    value: 'self_compassion',
    label: 'Compasión contigo',
    description: 'Autocuidado, palabras amables o ritual relajante.',
    aliases: ['autocuidado', 'compasión'],
  },
];

export const HABIT_TAG_LABEL_LOOKUP = HABIT_TAGS.reduce((acc, tag) => {
  acc[tag.value] = tag.label;
  return acc;
}, {});

const HABIT_TAG_VALUE_MAP = HABIT_TAGS.reduce((acc, tag) => {
  acc[normalizeBase(tag.value)] = tag.value;
  (tag.aliases ?? []).forEach((alias) => {
    acc[normalizeBase(alias)] = tag.value;
  });
  return acc;
}, {});

export const normalizeHabitTag = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = HABIT_TAG_VALUE_MAP[normalizeBase(value)];
  return normalized ?? null;
};

export const HABIT_GOAL_OPTIONS = HABIT_TAGS.map(({ value, label }) => ({
  value,
  label,
}));
