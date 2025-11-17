import { useEffect } from "react";
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

  // Aquí podrías manejar otros tipos, por ejemplo solicitudes de amistad.
};

// Escucha la respuesta a notificaciones y navega al chat correspondiente.
export const useNotificationNavigation = () => {
  useEffect(() => {
    let isMounted = true;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (!isMounted) {
          return;
        }
        handleNotificationNavigation(response);
      },
    );

    // Maneja el caso en que la app se abre desde una notificación cuando estaba cerrada.
    Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (!isMounted || !lastResponse) {
        return;
      }
      handleNotificationNavigation(lastResponse);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
};
