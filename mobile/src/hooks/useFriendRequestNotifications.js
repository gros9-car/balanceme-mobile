import { AppState } from "react-native";
import { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { navigationRef } from "../navigation/navigationRef";
import { sendLocalNotification } from "./useNotificationSetup";
import { db } from "../screens/firebase/config";

const shouldShowLocalNotification = () => AppState.currentState === "active";

const isViewingRequests = () => {
  const route = navigationRef.getCurrentRoute?.();
  return route?.name === "Social";
};

const isIncomingPending = (docSnapshot, userUid) => {
  const data = docSnapshot.data() ?? {};
  const status = data.status ?? "pending";
  const initiatedBy = data.initiatedBy;
  return (
    status === "pending" && Boolean(initiatedBy) && initiatedBy !== userUid
  );
};

/**
 * Hook que escucha en tiempo real la coleccion de amistades del usuario
 * para detectar nuevas solicitudes pendientes y mostrar un aviso in-app
 * reutilizando el sistema de notificaciones actual.
 *
 * @param {{ enabled: boolean, userUid?: string }} params
 *   enabled controla si el hook debe suscribirse; userUid es el UID del usuario.
 */
export const useFriendRequestNotifications = ({ enabled, userUid }) => {
  const previousPending = useRef(new Set());
  const didLoad = useRef(false);

  useEffect(() => {
    if (!enabled || !userUid) {
      previousPending.current = new Set();
      didLoad.current = false;
      return () => {};
    }

    const friendshipsRef = collection(db, "users", userUid, "friendships");

    const unsubscribe = onSnapshot(friendshipsRef, (snapshot) => {
      const nextPending = new Set();

      snapshot.forEach((docSnapshot) => {
        if (isIncomingPending(docSnapshot, userUid)) {
          nextPending.add(docSnapshot.id);
        }
      });

      if (didLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (
            (change.type === "added" || change.type === "modified") &&
            isIncomingPending(change.doc, userUid) &&
            !previousPending.current.has(change.doc.id)
          ) {
            const data = change.doc.data() ?? {};
            const senderName = data.name ?? "Usuario";

            if (shouldShowLocalNotification() && !isViewingRequests()) {
              sendLocalNotification({
                title: "Nueva solicitud de amistad",
                body: `${senderName} quiere conectar contigo.`,
                data: {
                  type: "FRIEND_REQUEST",
                  requestId: change.doc.id,
                  senderId: data.initiatedBy,
                  senderName,
                  targetUid: userUid,
                },
              });
            }
          }
        });
      }

      previousPending.current = nextPending;
      didLoad.current = true;
    });

    return unsubscribe;
  }, [enabled, userUid]);
};
