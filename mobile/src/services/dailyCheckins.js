import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '../screens/firebase/config';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateId = (value = new Date()) => {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dailyCheckinsCollection = (userUid) =>
  collection(db, 'users', userUid, 'dailyCheckins');

/**
 * @typedef {Object} DailyCheckin
 * @property {string} date - Fecha en formato 'YYYY-MM-DD'.
 * @property {boolean} moodLogged - true si se registró estado de ánimo ese día.
 * @property {boolean} habitsLogged - true si se registraron hábitos ese día.
 */

/**
 * Hace un upsert del check-in diario del usuario para el día actual.
 * Solo marca en true las banderas recibidas (nunca desmarca a false).
 *
 * @param {string} userUid
 * @param {{ moodLogged?: boolean, habitsLogged?: boolean }} [flags]
 * @returns {Promise<void>}
 */
export const upsertDailyCheckin = async (userUid, flags = {}) => {
  if (!userUid) {
    return;
  }

  const { moodLogged, habitsLogged } = flags;

  if (moodLogged !== true && habitsLogged !== true) {
    return;
  }

  const today = startOfDay(new Date());
  const todayId = formatDateId(today);
  const ref = doc(dailyCheckinsCollection(userUid), todayId);
  const now = serverTimestamp();

  const existingSnap = await getDoc(ref);

  if (existingSnap.exists()) {
    const payload = {
      date: todayId,
      updatedAt: now,
    };
    if (moodLogged === true) {
      payload.moodLogged = true;
    }
    if (habitsLogged === true) {
      payload.habitsLogged = true;
    }

    await setDoc(ref, payload, { merge: true });
    return;
  }

  await setDoc(
    ref,
    {
      date: todayId,
      moodLogged: moodLogged === true,
      habitsLogged: habitsLogged === true,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
};

/**
 * Obtiene los check-ins diarios más recientes del usuario.
 *
 * @param {string} userUid
 * @param {number} [days=60]
 * @returns {Promise<DailyCheckin[]>}
 */
export const fetchDailyCheckins = async (userUid, days = 60) => {
  if (!userUid) {
    return [];
  }

  const maxDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 60;

  const ref = dailyCheckinsCollection(userUid);
  const q = query(ref, orderBy('date', 'desc'), limit(maxDays));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() ?? {};
    const date =
      typeof data.date === 'string' && data.date
        ? data.date
        : docSnapshot.id;

    return {
      date,
      moodLogged: data.moodLogged === true,
      habitsLogged: data.habitsLogged === true,
    };
  });
};

/**
 * Construye un conjunto de fechas válidas para la racha.
 * Un día es válido si moodLogged === true && habitsLogged === true.
 *
 * @param {DailyCheckin[]} dailyCheckins
 * @returns {Set<string>}
 */
export const getValidStreakDates = (dailyCheckins = []) => {
  const valid = new Set();

  if (!Array.isArray(dailyCheckins)) {
    return valid;
  }

  dailyCheckins.forEach((checkin) => {
    if (
      checkin &&
      checkin.moodLogged === true &&
      checkin.habitsLogged === true &&
      typeof checkin.date === 'string' &&
      checkin.date
    ) {
      valid.add(checkin.date);
    }
  });

  return valid;
};

/**
 * Calcula la racha actual de días consecutivos.
 * La racha siempre se cuenta desde HOY hacia atrás.
 *
 * Regla:
 *  - Un día cuenta solo si moodLogged === true && habitsLogged === true.
 *  - Si hoy no es válido, la racha es 0.
 *
 * @param {DailyCheckin[]} dailyCheckins
 * @returns {number}
 */
export const calculateStreak = (dailyCheckins = []) => {
  const validDays = getValidStreakDates(dailyCheckins);

  const today = startOfDay(new Date());
  const todayId = formatDateId(today);

  if (!validDays.has(todayId)) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(today.getTime());

  // Desde hoy hacia atrás mientras cada día sea válido.
  // Incluimos hoy siempre que sea válido.
  while (true) {
    const key = formatDateId(cursor);
    if (!validDays.has(key)) {
      break;
    }
    streak += 1;
    cursor = new Date(cursor.getTime() - MILLISECONDS_PER_DAY);
  }

  return streak;
};

/**
 * Calcula la racha actual del usuario leyendo los últimos días de actividad.
 *
 * @param {string} userUid
 * @returns {Promise<number>}
 */
export const getUserStreak = async (userUid) => {
  if (!userUid) {
    return 0;
  }

  const recentCheckins = await fetchDailyCheckins(userUid, 60);
  return calculateStreak(recentCheckins);
};

