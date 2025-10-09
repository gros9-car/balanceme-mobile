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

export const useNotificationSetup = () => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    requestPermissionsAsync().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

  return hasPermission;
};
