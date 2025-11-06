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

export const defaultMoodScore = { valence: 0, energy: 0 };

export const getEmojiScore = (emojiName) => emojiScoreTable[emojiName] ?? defaultMoodScore;

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
