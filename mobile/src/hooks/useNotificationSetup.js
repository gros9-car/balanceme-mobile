import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../screens/firebase/config";

let ensureChannelPromise;
let permissionGranted = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Crea (si no existe) el canal de notificaciones por defecto en Android
 * para que las notificaciones tengan alta prioridad y sonido.
 *
 * En iOS/web no hace nada.
 */
const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!ensureChannelPromise) {
    ensureChannelPromise = Notifications.setNotificationChannelAsync(
      "default",
      {
        name: "General",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      },
    );
  }

  await ensureChannelPromise;
};

/**
 * Obtiene el estado actual de los permisos de notificaciones del sistema.
 *
 * En web devuelve un estado "unavailable".
 *
 * @returns {Promise<Notifications.NotificationPermissionsStatus>} Estado bruto de permisos.
 */
export const getNotificationPermissionStatus = async () => {
  if (Platform.OS === "web") {
    return {
      status: "unavailable",
      granted: false,
      canAskAgain: false,
    };
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings;
  } catch {
    return {
      status: "error",
      granted: false,
      canAskAgain: false,
    };
  }
};

/**
 * Solicita permisos de notificaciones si aún no han sido concedidos.
 *
 * Marca un flag global `permissionGranted` para reutilizar el estado.
 *
 * @returns {Promise<boolean>} true si se tienen permisos suficientes.
 */
export const requestNotificationPermissionsIfNeeded = async () => {
  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    permissionGranted = true;
    return true;
  }

  const response = await Notifications.requestPermissionsAsync();
  permissionGranted =
    response.granted ||
    response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return permissionGranted;
};

/**
 * Registra el dispositivo actual para recibir notificaciones push de Expo
 * y devuelve el token Expo obtenido, o null en caso de fallo.
 *
 * @returns {Promise<string|null>} Token Expo Push o null.
 */
export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return tokenResponse?.data ?? null;
};

/**
 * Guarda el token de push asociado al usuario tanto en la subcolección
 * `users/{uid}/devices` como en campos planos del documento de usuario.
 *
 * @param {string} userUid UID del usuario autenticado.
 * @param {string} token Token Expo Push que se quiere registrar.
 */
const savePushTokenForUserAsync = async (userUid, token) => {
  if (!userUid || !token) {
    return;
  }

  const ref = doc(db, "users", userUid, "devices", token);
  await setDoc(
    ref,
    {
      token,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const userRef = doc(db, "users", userUid);
  await setDoc(
    userRef,
    {
      expoPushToken: token,
      pushTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Programa una notificación local inmediata en el dispositivo.
 * Si aún no hay permisos, intenta solicitarlos antes.
 *
 * @param {{ title: string, body: string, data?: object }} params
 */
export const sendLocalNotification = async ({ title, body, data }) => {
  if (!permissionGranted) {
    const granted = await requestNotificationPermissionsIfNeeded();
    if (!granted) {
      return;
    }
  }

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
    },
    trigger: null,
  });
};

/**
 * Hook que se encarga de solicitar permisos de notificación, registrar
 * el token de push de Expo y guardarlo en Firestore para el usuario dado.
 *
 * Devuelve null mientras está verificando, true si hay permisos suficientes,
 * o false si el usuario los ha denegado.
 *
 * @param {string|null} userUid UID del usuario autenticado.
 * @returns {boolean|null} Estado de permisos de notificaciones.
 */
export const useNotificationSetup = (userUid) => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const granted = await requestNotificationPermissionsIfNeeded();
      if (!isMounted) {
        return;
      }

      setHasPermission(granted);

      if (!granted || !userUid) {
        return;
      }

      try {
        await ensureAndroidChannel();
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushTokenForUserAsync(userUid, token);
        }
      } catch {
        // En caso de error al registrar el token, seguimos sin bloquear la app.
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [userUid]);

  return hasPermission;
};

/**
 * Helper para registrar manualmente el token de push del usuario actual
 * sin usar el hook (por ejemplo en flujos específicos de configuración).
 */
export const setupPushToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    return;
  }

  const granted = await requestNotificationPermissionsIfNeeded();
  if (!granted) {
    return;
  }

  try {
    await ensureAndroidChannel();
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await savePushTokenForUserAsync(user.uid, token);
    }
  } catch {
    // No bloqueamos la app si algo falla al registrar el token.
  }
};
