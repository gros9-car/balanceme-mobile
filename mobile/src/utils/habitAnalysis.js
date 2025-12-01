const habitAgentProfiles = {
  movimiento: {
    keywords: [
      'correr',
      'caminar',
      'yoga',
      'ejercicio',
      'entren',
      'pesas',
      'bicicleta',
      'ruta',
      'gimnasio',
      'cardio',
      'pilates',
      'baile',
    ],
    summary: 'Tu rutina muestra intencion de movimiento y actividad fisica.',
    tips: [
      'Recuerda hidratarte y realizar estiramientos de recuperacion.',
      'Suma breves pausas de respiracion para equilibrar energia.',
    ],
  },
  descanso: {
    keywords: ['descans', 'dorm', 'siesta', 'relaj', 'sueno', 'acostar', 'despert'],
    summary: 'Estas priorizando el descanso, lo cual ayuda a tu balance.',
    tips: [
      'Mantener horarios constantes mejora la calidad del descanso.',
      'Describe como te sentiste al despertar para seguir midiendo tu energia.',
    ],
  },
  alimentacion: {
    keywords: [
      'comida',
      'vegetal',
      'fruta',
      'nutric',
      'cena',
      'almuerzo',
      'diet',
      'agua',
      'hidrata',
    ],
    summary: 'Tu plan refleja conciencia sobre la alimentacion.',
    tips: [
      'Anota como te sientes despues de comer para identificar patrones.',
      'Acompana tus comidas con pausas de respiracion para digerir mejor.',
    ],
  },
  mindfulness: {
    keywords: [
      'medit',
      'respir',
      'gratitud',
      'diario',
      'afirmacion',
      'mindfulness',
      'atencion plena',
      'oracion',
    ],
    summary: 'Estas cultivando la presencia y el bienestar emocional.',
    tips: [
      'Realiza tres respiraciones profundas antes de comenzar tus actividades clave.',
      'Registra una frase que resuma la calma que obtuviste.',
    ],
  },
  social: {
    keywords: [
      'familia',
      'amiga',
      'pareja',
      'salir',
      'convers',
      'llam',
      'compart',
    ],
    summary: 'Incluiste momentos de conexion social en tu dia.',
    tips: [
      'Agradece el impacto positivo que esas interacciones generaron.',
      'Planifica el siguiente espacio de conexion para mantener la energia.',
    ],
  },
  trabajo: {
    keywords: ['trabajo', 'estudio', 'proyecto', 'tarea', 'objetivo', 'plan', 'reunion'],
    summary: 'Estas organizando tus responsabilidades con intencion.',
    tips: [
      'Reserva micro descansos para evitar la fatiga mental.',
      'Celebra el avance alcanzado por pequeno que parezca.',
    ],
  },
  autocuidado: {
    keywords: ['autocuidado', 'spa', 'rutina de piel', 'leer', 'series', 'hobby', 'creativ', 'arte'],
    summary: 'Tu plan contiene momentos de autocuidado y disfrute.',
    tips: [
      'Describe la sensacion que buscabas al darte ese espacio.',
      'Registra tres cosas que agradeces de ese momento personal.',
    ],
  },
};

const fallbackAgentResponse = {
  summary: 'Gracias por compartir tus habitos. Mantener registros te ayuda a ver tu progreso.',
  tips: [
    'Agrega detalles sobre como te sentiste antes y despues de cada habito.',
    'Incluye un micro-habito que puedas repetir manana para sostener la racha.',
  ],
};

/**
 * Analiza un texto libre donde el usuario describe sus hábitos
 * y devuelve categorías detectadas, un resumen y hasta tres tips.
 *
 * @param {string} text Descripción de hábitos escrita por el usuario.
 * @returns {{ summary: string, tips: string[], categories: string[] }} Análisis semántico básico.
 */
export const analyzeHabitsEntry = (text) => {
  const normalized = (text ?? '').toLowerCase();
  if (!normalized.trim()) {
    return { ...fallbackAgentResponse, categories: [] };
  }

  const scores = {};

  Object.entries(habitAgentProfiles).forEach(([category, profile]) => {
    if (profile.keywords.some((keyword) => normalized.includes(keyword))) {
      scores[category] = (scores[category] ?? 0) + 1;
    }
  });

  const categories = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  if (!categories.length) {
    return { ...fallbackAgentResponse, categories: [] };
  }

  const primary = categories[0];
  const summary = habitAgentProfiles[primary]?.summary ?? fallbackAgentResponse.summary;

  const collectedTips = [];
  categories.slice(0, 3).forEach((category) => {
    collectedTips.push(...(habitAgentProfiles[category]?.tips ?? []));
  });

  return {
    summary,
    tips: collectedTips.slice(0, 3),
    categories,
  };
};

/**
 * Convierte identificadores internos de categorías de hábitos en etiquetas
 * legibles en español para mostrar en la interfaz.
 *
 * @param {string[]} [categories] Identificadores internos de categoría.
 * @returns {string[]} Etiquetas legibles para la UI.
 */
export const mapHabitCategoriesToLabels = (categories = []) =>
  categories.map((category) => {
    switch (category) {
      case 'movimiento':
        return 'Movimiento';
      case 'descanso':
        return 'Descanso';
      case 'alimentacion':
        return 'Alimentacion';
      case 'mindfulness':
        return 'Mindfulness';
      case 'social':
        return 'Conexion social';
      case 'trabajo':
        return 'Foco y trabajo';
      case 'autocuidado':
        return 'Autocuidado';
      default:
        return category;
    }
  });

/**
 * Mapa de perfiles de agente de hábitos, con palabras clave,
 * resúmenes y sugerencias asociadas a cada categoría.
 */
export const HABIT_AGENT_PROFILES = habitAgentProfiles;
