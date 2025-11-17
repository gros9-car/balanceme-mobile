import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../screens/firebase/config";

let ensureChannelPromise;
let permissionGranted = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Crea el canal de notificaciones requerido en Android una sola vez.
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

// Solicita permisos de notificaciones manejando los estados de iOS y Android.
const requestPermissionsAsync = async () => {
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

// Registra el dispositivo para recibir notificaciones push de Expo y devuelve el token.
export const registerForPushNotificationsAsync = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
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

// Guarda/actualiza el token push en Firestore bajo el usuario autenticado.
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
};

// Envía una notificación local asegurando permisos y canal.
export const sendLocalNotification = async ({ title, body, data }) => {
  if (!permissionGranted) {
    const granted = await requestPermissionsAsync();
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

// Hook que inicializa permisos de notificación, registra el token y expone su estado.
export const useNotificationSetup = (userUid) => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const granted = await requestPermissionsAsync();
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
