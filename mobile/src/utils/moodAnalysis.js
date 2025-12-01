const emojiScoreTable = {
  alegre: { valence: 2, energy: 2 },
  agradecido: { valence: 2, energy: 1 },
  tranquilo: { valence: 1, energy: 0.5 },
  motivado: { valence: 2, energy: 2 },
  energico: { valence: 1.5, energy: 2 },
  estresado: { valence: -1.5, energy: 1.5 },
  ansioso: { valence: -2, energy: 1.5 },
  cansado: { valence: -1, energy: 0.5 },
  triste: { valence: -2, energy: 0.5 },
  enojado: { valence: -2, energy: 1.5 },
  happy: { valence: 2, energy: 1.5 },
  calm: { valence: 1, energy: 0.5 },
  sad: { valence: -2, energy: 0.5 },
  anxious: { valence: -2, energy: 1.5 },
  angry: { valence: -2, energy: 2 },
  neutral: { valence: 0, energy: 1 },
};

/**
 * Puntuación neutra por defecto cuando no hay información de emojis.
 */
export const defaultMoodScore = { valence: 0, energy: 0 };

/**
 * Devuelve la puntuación de valencia/energía asociada a un nombre de emoji,
 * o una puntuación neutra si el emoji no está registrado.
 *
 * @param {string} emojiName Nombre normalizado del emoji de estado de ánimo.
 * @returns {{ valence: number, energy: number }} Puntuación asociada.
 */
export const getEmojiScore = (emojiName) => emojiScoreTable[emojiName] ?? defaultMoodScore;

/**
 * Calcula el promedio de valencia y energía a partir de una lista de emojis.
 *
 * @param {string[]} [emojiNames] Lista de nombres de emojis seleccionados.
 * @returns {{ valence: number, energy: number }} Promedio numérico redondeado a 2 decimales.
 */
export const computeMoodAverages = (emojiNames = []) => {
  if (!emojiNames.length) {
    return defaultMoodScore;
  }

  const totals = emojiNames.reduce(
    (acc, name) => {
      const score = getEmojiScore(name);
      acc.valence += score.valence;
      acc.energy += score.energy;
      return acc;
    },
    { valence: 0, energy: 0 },
  );

  return {
    valence: Number((totals.valence / emojiNames.length).toFixed(2)),
    energy: Number((totals.energy / emojiNames.length).toFixed(2)),
  };
};

/**
 * Convierte una puntuación de estado de ánimo en una etiqueta categórica
 * simple para mostrar en la interfaz.
 *
 * @param {{ valence: number, energy: number }|null} score Puntuación calculada.
 * @returns {"positivo"|"desafiante"|"estable"|"neutral"} Etiqueta descriptiva.
 */
export const moodScoreToLabel = (score) => {
  if (!score) {
    return 'neutral';
  }

  if (score.valence >= 1.5) {
    return 'positivo';
  }
  if (score.valence <= -1.5) {
    return 'desafiante';
  }
  return 'estable';
};
