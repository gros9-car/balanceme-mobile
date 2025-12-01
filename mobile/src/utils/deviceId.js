import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "device:id";

let cachedDeviceId = null;

/**
 * Obtiene un identificador pseudo-único para el dispositivo actual.
 * Se persiste en AsyncStorage para que sea estable entre sesiones.
 *
 * @returns {Promise<string>} ID de dispositivo estable para usar en la app.
 */
export const getDeviceIdAsync = async () => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cachedDeviceId = existing;
      return existing;
    }

    const randomPart = Math.random().toString(36).slice(2);
    const timePart = Date.now().toString(36);
    const newId = `${timePart}-${randomPart}`;

    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    cachedDeviceId = newId;
    return newId;
  } catch {
    const fallback = `fallback-${Math.random().toString(36).slice(2)}`;
    cachedDeviceId = fallback;
    return fallback;
  }
};
