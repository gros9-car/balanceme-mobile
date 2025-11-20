// Utilidades compartidas para las ventanas de habilitación
// de "Ingresar emociones" y "Ingresar hábitos".
//
// Estas funciones son la única fuente de verdad de la regla
// de 24 horas. La UI y el sistema de recordatorios deben usar
// siempre estos helpers para calcular la próxima fecha en que
// se habilita cada sección.

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

/**
 * Calcula la próxima fecha en la que se podrá volver a registrar
 * el estado de ánimo, a partir de la fecha del último registro.
 *
 * @param {Date|null|undefined} lastEmotionDate Fecha del último registro.
 * @returns {Date|null} Fecha en la que se vuelve a habilitar o null si no aplica.
 */
export const getNextEmotionEnableDate = (lastEmotionDate) => {
  if (!isValidDate(lastEmotionDate)) {
    return null;
  }
  return new Date(lastEmotionDate.getTime() + HOURS_24_MS);
};

/**
 * Calcula la próxima fecha en la que se podrán registrar nuevos
 * hábitos diarios, a partir de la fecha del último registro.
 *
 * @param {Date|null|undefined} lastHabitDate Fecha del último registro.
 * @returns {Date|null} Fecha en la que se vuelve a habilitar o null si no aplica.
 */
export const getNextHabitEnableDate = (lastHabitDate) => {
  if (!isValidDate(lastHabitDate)) {
    return null;
  }
  return new Date(lastHabitDate.getTime() + HOURS_24_MS);
};

