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

