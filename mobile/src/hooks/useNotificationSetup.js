import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

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

// Hook que inicializa permisos de notificación y expone su estado.
export const useNotificationSetup = () => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    requestPermissionsAsync().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

  return hasPermission;
};
