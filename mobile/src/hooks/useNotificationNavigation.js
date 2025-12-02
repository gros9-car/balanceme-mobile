import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { navigationRef } from "../navigation/navigationRef";
import { auth } from "../screens/firebase/config";

const normalizeType = (value) =>
  typeof value === "string" ? value.toLowerCase() : "";

const navigateToChat = (data) => {
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid;
  const friendUid = data.friendUid || data.senderId || data.fromUserId;

  if (friendUid) {
    navigationRef.navigate("DirectChat", {
      friendUid,
      friendName: data.friendName || data.senderName,
      friendEmail: data.friendEmail || data.senderEmail,
    });
    return true;
  }

  if (data.chatId && currentUid) {
    const parts = String(data.chatId).split("_");
    const derivedFriendUid = parts.find((id) => id && id !== currentUid);

    if (derivedFriendUid) {
      navigationRef.navigate("DirectChat", {
        friendUid: derivedFriendUid,
      });
      return true;
    }
  }

  return false;
};

const navigateToFriendRequests = (data) => {
  navigationRef.navigate("Social", {
    focus: "requests",
    requestId: data.requestId || data.friendUid || data.fromUserId,
    senderId: data.senderId || data.friendUid || data.fromUserId,
    senderName: data.senderName || data.friendName,
  });
};

/**
 * Interpreta el contenido de una respuesta de notificacion de Expo
 * y navega a la pantalla correspondiente (chat directo, recordatorios,
 * soporte, social, etc.) usando la referencia global de navegacion.
 *
 * @param {import('expo-notifications').NotificationResponse} response
 */
const handleNotificationNavigation = (response) => {
  const data = response?.notification?.request?.content?.data;
  const type = normalizeType(data?.type || data?.legacyType);

  if (!data || !navigationRef.isReady()) {
    return;
  }

  if (
    type === "chat" ||
    type === "direct-message" ||
    type === "new_message" ||
    type === "new-message"
  ) {
    navigateToChat(data);
    return;
  }

  if (type === "support-chat") {
    navigationRef.navigate("SupportChat");
    return;
  }

  if (type === "emotion-reminder") {
    navigationRef.navigate("Mood");
    return;
  }
  if (type === "habit-reminder") {
    navigationRef.navigate("Habits");
    return;
  }

  if (type === "friend-request" || type === "friend_request") {
    navigateToFriendRequests(data);
    return;
  }
};

/**
 * Hook que registra un listener global de respuestas a notificaciones push
 * para redirigir al usuario a la pantalla adecuada cuando toca una notificacion.
 *
 * Tambien procesa la ultima notificacion pendiente (si la app se abrio desde ella).
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
      // noop
    }

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
};
