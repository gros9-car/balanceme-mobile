import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { navigationRef } from "../navigation/navigationRef";

const handleNotificationNavigation = (response) => {
  const data = response?.notification?.request?.content?.data;

  if (!data || !navigationRef.isReady()) {
    return;
  }

  // Mensajes de chat directo entre usuarios.
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

  // Mensajes del chat de soporte.
  if (data.type === "support-chat") {
    navigationRef.navigate("SupportChat");
    return;
  }

  // Aqu�� podr��as manejar otros tipos, por ejemplo solicitudes de amistad.
};

// Escucha la respuesta a notificaciones y navega al chat correspondiente.
export const useNotificationNavigation = () => {
  useEffect(() => {
    // En web, expo-notifications no está disponible: evitamos usar sus APIs.
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

    // Maneja el caso en que la app se abre desde una notificaci��n cuando estaba cerrada.
    try {
      Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
        if (!isMounted || !lastResponse) {
          return;
        }
        handleNotificationNavigation(lastResponse);
      });
    } catch {
      // En plataformas donde no esté disponible, simplemente lo ignoramos.
    }

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
};

