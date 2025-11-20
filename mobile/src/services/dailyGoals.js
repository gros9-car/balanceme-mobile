import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
  query,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../screens/firebase/config';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
export const DAILY_GOAL_WEEK_SUCCESS_THRESHOLD = 0.6;

const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// Semana tipo ISO: lunes (0:00) a domingo (23:59)
const getWeekStart = (value) => {
  const date = startOfDay(value);
  const day = date.getDay(); // 0 = domingo, 1 = lunes, ...
  const diff = (day + 6) % 7; // lunes -> 0, domingo -> 6
  date.setDate(date.getDate() - diff);
  return startOfDay(date);
};

const formatDateKey = (value) => {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Clave de semana basada en el lunes correspondiente.
const formatWeekKey = (weekStartDate) => formatDateKey(weekStartDate);

const dailyGoalsCollection = (userUid) =>
  collection(db, 'users', userUid, 'dailyGoals');

const checkinsCollection = (userUid, goalId) =>
  collection(db, 'users', userUid, 'dailyGoals', goalId, 'checkins');

const toDateSafe = (value) => {
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  return null;
};

// Normaliza un documento de meta diaria desde Firestore.
const mapDailyGoalDoc = (docSnapshot) => {
  const data = docSnapshot.data() ?? {};
  const createdAtDate = toDateSafe(data.createdAt);
  const updatedAtDate = toDateSafe(data.updatedAt);
  const weekStartDate = toDateSafe(data.weekStart);
  const lastCompletedDate = toDateSafe(data.lastCompletedDate);

  return {
    id: docSnapshot.id,
    title: data.title ?? 'Meta diaria',
    category: data.category ?? 'custom',
    isActive: data.isActive !== false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdAtDate,
    updatedAtDate,
    weekStart: data.weekStart ?? null,
    weekStartDate,
    currentStreakWeeks: Number(data.currentStreakWeeks ?? 0) || 0,
    bestStreakWeeks: Number(data.bestStreakWeeks ?? 0) || 0,
    lastCompletedDate: data.lastCompletedDate ?? null,
    lastCompletedAtDate: lastCompletedDate,
  };
};

// Normaliza un documento de check-in diario (un día concreto).
const mapCheckinDoc = (docSnapshot) => {
  const data = docSnapshot.data() ?? {};
  const date = toDateSafe(data.date);
  const dateKey = data.dateKey || (date ? formatDateKey(date) : docSnapshot.id);

  return {
    id: docSnapshot.id,
    date,
    dateKey,
    done: Boolean(data.done),
  };
};

/**
 * Indica si una meta diaria tiene un check-in marcado como "hecho" para hoy.
 *
 * @param {string} goalId
 * @param {Array<{dateKey?: string, date?: Date, done?: boolean}>} checkins
 * @param {Date} [referenceDate]
 * @returns {boolean}
 */
export const isGoalDoneToday = (goalId, checkins, referenceDate = new Date()) => {
  if (!Array.isArray(checkins) || !checkins.length) {
    return false;
  }
  const todayKey = formatDateKey(referenceDate);
  return checkins.some(
    (checkin) =>
      checkin &&
      checkin.done &&
      (checkin.dateKey === todayKey ||
        (checkin.date instanceof Date &&
          !Number.isNaN(checkin.date.getTime()) &&
          formatDateKey(checkin.date) === todayKey)),
  );
};

/**
 * Calcula el resumen semanal de cumplimiento para una meta.
 * La semana siempre se considera de 7 días (lunes a domingo).
 *
 * @param {Array<{dateKey?: string, date?: Date, done?: boolean}>} goalCheckins
 * @param {Date} weekStartDate Lunes de la semana a evaluar.
 * @returns {{completedDays: number, totalDays: number, completionRatio: number, completionPercent: number}}
 */
export const getWeeklyCompletion = (goalCheckins, weekStartDate) => {
  if (!Array.isArray(goalCheckins)) {
    goalCheckins = [];
  }

  const weekStart = getWeekStart(weekStartDate);
  const doneKeys = new Set(
    goalCheckins
      .filter((checkin) => checkin && checkin.done)
      .map((checkin) => {
        if (checkin.dateKey) {
          return checkin.dateKey;
        }
        if (checkin.date instanceof Date && !Number.isNaN(checkin.date.getTime())) {
          return formatDateKey(checkin.date);
        }
        return null;
      })
      .filter(Boolean),
  );

  let completedDays = 0;
  for (let offset = 0; offset < DAYS_PER_WEEK; offset += 1) {
    const date = new Date(weekStart.getTime() + offset * MILLISECONDS_PER_DAY);
    const key = formatDateKey(date);
    if (doneKeys.has(key)) {
      completedDays += 1;
    }
  }

  const totalDays = DAYS_PER_WEEK;
  const completionRatio =
    totalDays > 0 ? Math.min(1, Math.max(0, completedDays / totalDays)) : 0;
  const completionPercent = Math.round(completionRatio * 100);

  return {
    completedDays,
    totalDays,
    completionRatio,
    completionPercent,
  };
};

/**
 * Recalcula el estado semanal y la racha de una meta diaria.
 * Considera las 20 semanas mǭs recientes (aprox. 5 meses).
 *
 * @param {{ userUid: string, goalId: string, maxWeeks?: number }} params
 */
export const updateWeeklyStatsAndStreak = async ({
  userUid,
  goalId,
  maxWeeks = 20,
}) => {
  if (!userUid || !goalId) {
    return;
  }

  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const goalRef = doc(db, 'users', userUid, 'dailyGoals', goalId);
  const checkinsRef = checkinsCollection(userUid, goalId);

  // Leemos hasta 140 dǭas (20 semanas).
  const checkinsQuery = query(
    checkinsRef,
    orderBy('date', 'desc'),
    limit(maxWeeks * DAYS_PER_WEEK),
  );
  const snapshot = await getDocs(checkinsQuery);

  const checkins = snapshot.docs.map(mapCheckinDoc);

  // Semanas recientes: 0 = semana actual, 1 = semana anterior, etc.
  const weekResults = [];
  for (let i = 0; i < maxWeeks; i += 1) {
    const weekStart = new Date(
      currentWeekStart.getTime() - i * DAYS_PER_WEEK * MILLISECONDS_PER_DAY,
    );
    const { completedDays, totalDays, completionRatio } = getWeeklyCompletion(
      checkins,
      weekStart,
    );
    weekResults.push({
      weekStart,
      weekKey: formatWeekKey(weekStart),
      completedDays,
      totalDays,
      completionRatio,
      successful: completionRatio >= DAILY_GOAL_WEEK_SUCCESS_THRESHOLD,
    });
  }

  // Racha actual: semanas exitosas consecutivas terminando en la semana actual.
  let currentStreakWeeks = 0;
  for (let i = 0; i < weekResults.length; i += 1) {
    const info = weekResults[i];
    if (!info.successful) {
      break;
    }
    currentStreakWeeks += 1;
  }

  // Mejor racha dentro de la ventana analizada.
  let bestStreakWeeks = 0;
  let running = 0;
  for (let i = 0; i < weekResults.length; i += 1) {
    if (weekResults[i].successful) {
      running += 1;
      if (running > bestStreakWeeks) {
        bestStreakWeeks = running;
      }
    } else {
      running = 0;
    }
  }

  // ǭltimo dǭa con check-in exitoso.
  let lastCompletedDate = null;
  checkins.forEach((checkin) => {
    if (!checkin.done || !(checkin.date instanceof Date)) {
      return;
    }
    if (!lastCompletedDate || checkin.date > lastCompletedDate) {
      lastCompletedDate = checkin.date;
    }
  });

  const payload = {
    weekStart: Timestamp.fromDate(currentWeekStart),
    currentStreakWeeks,
    bestStreakWeeks,
    updatedAt: serverTimestamp(),
  };

  if (lastCompletedDate) {
    payload.lastCompletedDate = Timestamp.fromDate(startOfDay(lastCompletedDate));
  }

  await updateDoc(goalRef, payload);
};

/**
 * Marca la meta como "hecha hoy".
 * Si ya estaba marcada para hoy, no hace cambios (para evitar desmarcados accidentales).
 *
 * @param {{ userUid: string, goalId: string }} params
 * @returns {Promise<{ alreadyDone: boolean }>}
 */
export const toggleGoalToday = async ({ userUid, goalId }) => {
  if (!userUid || !goalId) {
    throw new Error('Sesion no disponible');
  }

  const today = startOfDay(new Date());
  const todayKey = formatDateKey(today);

  const checkinRef = doc(checkinsCollection(userUid, goalId), todayKey);
  const existingSnap = await getDoc(checkinRef);

  if (existingSnap.exists()) {
    const data = existingSnap.data() ?? {};
    if (data.done) {
      return { alreadyDone: true };
    }
  }

  await setDoc(checkinRef, {
    dateKey: todayKey,
    date: Timestamp.fromDate(today),
    done: true,
    updatedAt: serverTimestamp(),
  });

  try {
    await updateWeeklyStatsAndStreak({ userUid, goalId });
  } catch {
    // Si el recálculo falla, mantenemos el check-in pero no bloqueamos el flujo.
  }

  return { alreadyDone: false };
};

/**
 * Suscribe en tiempo real a las metas diarias del usuario.
 *
 * @param {string} userUid
 * @param {(goals: any[]) => void} callback
 * @returns {() => void}
 */
export const subscribeDailyGoals = (userUid, callback) => {
  if (!userUid) {
    callback([]);
    return () => {};
  }

  const goalsRef = dailyGoalsCollection(userUid);
  const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(goalsQuery, (snapshot) => {
    const goals = snapshot.docs.map(mapDailyGoalDoc);
    callback(goals);
  }, () => {
    callback([]);
  });
};

/**
 * Suscribe en tiempo real a los check-ins recientes de una meta.
 *
 * @param {string} userUid
 * @param {string} goalId
 * @param {{ maxDays?: number }} options
 * @param {(checkins: any[]) => void} callback
 * @returns {() => void}
 */
export const subscribeGoalCheckins = (
  userUid,
  goalId,
  options,
  callback,
) => {
  const maxDays = options?.maxDays ?? 140;

  if (!userUid || !goalId) {
    callback([]);
    return () => {};
  }

  const ref = checkinsCollection(userUid, goalId);
  const q = query(ref, orderBy('date', 'desc'), limit(maxDays));

  return onSnapshot(q, (snapshot) => {
    const checkins = snapshot.docs.map(mapCheckinDoc);
    callback(checkins);
  }, () => {
    callback([]);
  });
};

/**
 * Crea una nueva meta diaria para el usuario.
 *
 * @param {string} userUid
 * @param {{ title: string, category?: string, isActive?: boolean }} payload
 */
export const createDailyGoal = async (userUid, payload) => {
  if (!userUid) {
    throw new Error('Sesion no disponible');
  }

  const goalsRef = dailyGoalsCollection(userUid);
  const now = serverTimestamp();

  await addDoc(goalsRef, {
    title: payload.title ?? 'Meta diaria',
    category: payload.category ?? 'custom',
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    currentStreakWeeks: 0,
    bestStreakWeeks: 0,
  });
};

/**
 * Actualiza una meta diaria existente.
 *
 * @param {string} userUid
 * @param {string} goalId
 * @param {{ title?: string, category?: string, isActive?: boolean }} updates
 */
export const updateDailyGoal = async (userUid, goalId, updates = {}) => {
  if (!userUid) {
    throw new Error('Sesion no disponible');
  }
  if (!goalId) {
    throw new Error('goalId requerido');
  }

  const goalRef = doc(db, 'users', userUid, 'dailyGoals', goalId);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(goalRef, payload);
};

/**
 * Marca una meta diaria como inactiva (no se muestra en la lista principal).
 *
 * @param {string} userUid
 * @param {string} goalId
 */
export const deactivateDailyGoal = async (userUid, goalId) => {
  await updateDailyGoal(userUid, goalId, { isActive: false });
};

/**
 * Elimina por completo una meta diaria y sus check-ins asociados.
 * ¾Uso opcional y potencialmente destructivo¾
 *
 * @param {string} userUid
 * @param {string} goalId
 */
export const deleteDailyGoal = async (userUid, goalId) => {
  if (!userUid || !goalId) {
    return;
  }

  const goalRef = doc(db, 'users', userUid, 'dailyGoals', goalId);
  await deleteDoc(goalRef);
};
