import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { navigationRef } from "../navigation/navigationRef";
import { auth } from "../screens/firebase/config";

/**
 * Interpreta el contenido de una respuesta de notificación de Expo
 * y navega a la pantalla correspondiente (chat directo, recordatorios,
 * soporte, social, etc.) usando el navigationRef global.
 *
 * @param {import('expo-notifications').NotificationResponse} response
 */
const handleNotificationNavigation = (response) => {
  const data = response?.notification?.request?.content?.data;

  if (!data || !navigationRef.isReady()) {
    return;
  }

  if (
    (data.type === "chat" || data.type === "direct-message") &&
    data.friendUid
  ) {
    navigationRef.navigate("DirectChat", {
      friendUid: data.friendUid,
      friendName: data.friendName,
      friendEmail: data.friendEmail,
    });
    return;
  }

  if (data.type === "chat" && data.chatId && !data.friendUid) {
    const currentUser = auth.currentUser;
    const currentUid = currentUser?.uid;

    if (currentUid) {
      const parts = String(data.chatId).split("_");
      const friendUid = parts.find((id) => id && id !== currentUid);

      if (friendUid) {
        navigationRef.navigate("DirectChat", {
          friendUid,
        });
        return;
      }
    }
  }

  if (data.type === "support-chat") {
    navigationRef.navigate("SupportChat");
    return;
  }

  if (data.type === "emotion-reminder") {
    navigationRef.navigate("Mood");
    return;
  }
  if (data.type === "habit-reminder") {
    navigationRef.navigate("Habits");
    return;
  }

  if (data.type === "friend-request") {
    navigationRef.navigate("Social");
    return;
  }
};

/**
 * Hook que registra un listener global de respuestas a notificaciones push
 * para redirigir al usuario a la pantalla adecuada cuando toca una notificación.
 *
 * Se ejecuta una sola vez al montar la app y también procesa la última
 * notificación pendiente (si la app se abrió desde ella).
 */
export const useNotificationNavigation = () => {
  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }

    let isMounted = true;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (!isMounted) {
          return;
        }
        handleNotificationNavigation(response);
      },
    );

    try {
      Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
        if (!isMounted || !lastResponse) {
          return;
        }
        handleNotificationNavigation(lastResponse);
      });
    } catch {
    }

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
};
