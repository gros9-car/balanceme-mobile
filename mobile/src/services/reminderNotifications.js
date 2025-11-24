import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getNextEmotionEnableDate,
  getNextHabitEnableDate,
} from "../utils/reminderRules";

const EMOTION_REMINDER_KEY = "reminder:emotionNotificationId";
const HABIT_REMINDER_KEY = "reminder:habitNotificationId";

const storageKeyFor = (baseKey, uid) =>
  uid ? `${baseKey}:${uid}` : baseKey;

let ensureChannelPromise;

// Crea el canal de notificaciones para recordatorios en Android una sola vez.
const ensureReminderChannelAsync = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!ensureChannelPromise) {
    ensureChannelPromise = Notifications.setNotificationChannelAsync(
      "reminders",
      {
        name: "Recordatorios",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      },
    );
  }

  await ensureChannelPromise;
};

const scheduleInternal = async (baseKey, date, content, userUid) => {
  if (Platform.OS === "web") {
    return null;
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  if (date.getTime() <= Date.now()) {
    return null;
  }

  await ensureReminderChannelAsync();

  const storageKey = storageKeyFor(baseKey, userUid || null);
  const existingId = await AsyncStorage.getItem(storageKey);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Si falla la cancelación del ID previo, continuamos de todos modos.
    }
  }

  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: date,
  });

  try {
    await AsyncStorage.setItem(storageKey, id);
  } catch {
    // Si falla el guardado local del ID, no bloqueamos el uso.
  }

  return id;
};

const cancelInternal = async (baseKey, userUid) => {
  if (Platform.OS === "web") {
    return;
  }

  const storageKey = storageKeyFor(baseKey, userUid || null);
  const existingId = await AsyncStorage.getItem(storageKey);
  if (!existingId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  } catch {
    // Ignoramos fallos de cancelación para no romper la app.
  }

  try {
    await AsyncStorage.removeItem(storageKey);
  } catch {
    // Ignoramos errores de almacenamiento.
  }
};

/**
 * Programa un recordatorio para emociones a una fecha específica.
 *
 * @param {Date} date Fecha en la que se habilita de nuevo "Ingresar emociones".
 * @param {{ userUid?: string, title?: string, body?: string, data?: object }} overrides
 */
export const scheduleEmotionReminder = async (date, overrides = {}) => {
  const title =
    typeof overrides.title === "string" && overrides.title.trim()
      ? overrides.title.trim()
      : "Recuerda registrar cómo te sientes";
  const body =
    typeof overrides.body === "string" && overrides.body.trim()
      ? overrides.body.trim()
      : "BalanceMe ya permite ingresar de nuevo tu estado de ánimo diario.";

  const data = {
    type: "emotion-reminder",
    screen: "Mood",
    ...(overrides.data || {}),
  };

  const content = {
    title,
    body,
    data,
    sound: "default",
  };

  return scheduleInternal(EMOTION_REMINDER_KEY, date, content, overrides.userUid);
};

/**
 * Programa un recordatorio para hábitos a una fecha específica.
 *
 * @param {Date} date Fecha en la que se habilita de nuevo "Ingresar hábitos".
 * @param {{ userUid?: string, title?: string, body?: string, data?: object }} overrides
 */
export const scheduleHabitReminder = async (date, overrides = {}) => {
  const title =
    typeof overrides.title === "string" && overrides.title.trim()
      ? overrides.title.trim()
      : "Actualiza tus hábitos diarios";
  const body =
    typeof overrides.body === "string" && overrides.body.trim()
      ? overrides.body.trim()
      : "BalanceMe ya permite registrar de nuevo tus hábitos de hoy.";

  const data = {
    type: "habit-reminder",
    screen: "Habits",
    ...(overrides.data || {}),
  };

  const content = {
    title,
    body,
    data,
    sound: "default",
  };

  return scheduleInternal(HABIT_REMINDER_KEY, date, content, overrides.userUid);
};

/**
 * Cancela cualquier recordatorio programado para emociones.
 *
 * @param {{ userUid?: string }} overrides
 */
export const cancelEmotionReminder = async (overrides = {}) => {
  await cancelInternal(EMOTION_REMINDER_KEY, overrides.userUid);
};

/**
 * Cancela cualquier recordatorio programado para hábitos.
 *
 * @param {{ userUid?: string }} overrides
 */
export const cancelHabitReminder = async (overrides = {}) => {
  await cancelInternal(HABIT_REMINDER_KEY, overrides.userUid);
};

/**
 * Calcula y programa el siguiente recordatorio de emociones a partir
 * de la fecha del último registro.
 *
 * @param {Date|null} lastEmotionDate Fecha del último registro de emociones.
 * @param {string} userUid UID del usuario.
 */
export const scheduleNextEmotionReminderFromLastDate = async (
  lastEmotionDate,
  userUid,
) => {
  const nextDate = getNextEmotionEnableDate(lastEmotionDate);
  if (!nextDate) {
    await cancelEmotionReminder({ userUid });
    return;
  }
  await scheduleEmotionReminder(nextDate, { userUid });
};

/**
 * Calcula y programa el siguiente recordatorio de hábitos a partir
 * de la fecha del último registro.
 *
 * @param {Date|null} lastHabitDate Fecha del último registro de hábitos.
 * @param {string} userUid UID del usuario.
 */
export const scheduleNextHabitReminderFromLastDate = async (
  lastHabitDate,
  userUid,
) => {
  const nextDate = getNextHabitEnableDate(lastHabitDate);
  if (!nextDate) {
    await cancelHabitReminder({ userUid });
    return;
  }
  await scheduleHabitReminder(nextDate, { userUid });
};
