import { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../screens/firebase/config";

/**
 * Hook que escucha en tiempo real la colección de amistades del usuario
 * para detectar nuevas solicitudes pendientes. Por ahora solo mantiene
 * un conjunto interno de IDs para poder saber cuáles son "nuevas".
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
      const newRequests = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() ?? {};
        const status = data.status ?? "pending";
        const initiatedBy = data.initiatedBy;
        if (status === "pending" && initiatedBy && initiatedBy !== userUid) {
          nextPending.add(docSnapshot.id);
          if (didLoad.current && !previousPending.current.has(docSnapshot.id)) {
            newRequests.push({
              id: docSnapshot.id,
              name: data.name ?? "Usuario",
            });
          }
        }
      });

      previousPending.current = nextPending;
      didLoad.current = true;
    });

    return unsubscribe;
  }, [enabled, userUid]);
};
