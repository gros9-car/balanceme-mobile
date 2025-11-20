import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "../screens/firebase/config";

// Estructura por defecto para los ajustes de notificaciones de un usuario.
export const defaultNotificationSettings = {
  emotionsReminderEnabled: false,
  habitsReminderEnabled: false,
};

const normalizeSettings = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { ...defaultNotificationSettings };
  }

  const notifications = raw.notifications ?? raw;

  return {
    emotionsReminderEnabled: Boolean(notifications.emotionsReminderEnabled),
    habitsReminderEnabled: Boolean(notifications.habitsReminderEnabled),
  };
};

/**
 * Lee la configuración de notificaciones para un usuario dado.
 *
 * @param {string} uid UID del usuario autenticado.
 * @returns {Promise<{emotionsReminderEnabled: boolean, habitsReminderEnabled: boolean}>}
 */
export const getNotificationSettingsForUser = async (uid) => {
  if (!uid) {
    return { ...defaultNotificationSettings };
  }

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { ...defaultNotificationSettings };
    }

    const data = snap.data() ?? {};
    const settings = data.settings?.notifications ?? data.notifications ?? null;
    return normalizeSettings(settings);
  } catch {
    // En caso de fallo devolvemos valores seguros por defecto.
    return { ...defaultNotificationSettings };
  }
};

/**
 * Actualiza (con merge) la configuración de notificaciones de un usuario.
 *
 * @param {string} uid UID del usuario autenticado.
 * @param {Partial<{emotionsReminderEnabled: boolean, habitsReminderEnabled: boolean}>} patch
 * @returns {Promise<{emotionsReminderEnabled: boolean, habitsReminderEnabled: boolean}>}
 */
export const updateNotificationSettingsForUser = async (uid, patch) => {
  if (!uid) {
    return { ...defaultNotificationSettings };
  }

  const current = await getNotificationSettingsForUser(uid);
  const next = {
    ...current,
    ...(patch || {}),
  };

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        settings: {
          notifications: next,
        },
      },
      { merge: true },
    );
  } catch {
    // Si algo falla al escribir, mantenemos el valor calculado en memoria.
  }

  return next;
};

