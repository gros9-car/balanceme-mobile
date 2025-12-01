// Utilidades para formatear fechas y horas de forma consistente en la app.

// Intenta convertir distintos tipos de valores (Date, Timestamp de Firestore, número, string) a Date.
/**
 * Intenta convertir distintos tipos de valores (Date, Timestamp de Firestore,
 * número o string) a una instancia de Date. Si no puede, devuelve null.
 *
 * @param {*} value Valor a convertir a fecha.
 * @returns {Date|null} Fecha normalizada o null si no es válida.
 */
const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  try {
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch {
    // si falla, dejamos que el llamador reciba una fecha "ahora"
  }

  return null;
};

// Hora corta (24h) sin segundos, por ejemplo "12:04".
/**
 * Devuelve una hora corta (24h) sin segundos para mostrar en la interfaz,
 * por ejemplo "12:04". Si el valor no es una fecha válida, usa la fecha actual.
 *
 * @param {*} value Fecha o timestamp a formatear.
 * @returns {string} Hora formateada en formato HH:mm.
 */
export const formatTimeHM = (value) => {
  const date = toDateOrNull(value) ?? new Date();

  try {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

// Fecha y hora corta sin segundos, por ejemplo "31/12/2025 12:04".
/**
 * Devuelve una fecha y hora corta sin segundos para mostrar en la interfaz,
 * por ejemplo "31/12/2025 12:04". Si el valor no es válido, usa la fecha actual.
 *
 * @param {*} value Fecha o timestamp a formatear.
 * @returns {string} Fecha y hora formateadas en formato DD/MM/YYYY HH:mm.
 */
export const formatDateTimeShort = (value) => {
  const date = toDateOrNull(value) ?? new Date();

  try {
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
};
