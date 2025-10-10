import { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../screens/firebase/config";
import { sendLocalNotification } from "./useNotificationSetup";

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

      if (newRequests.length) {
        newRequests.forEach((request) => {
          sendLocalNotification({
            title: "Nueva solicitud de amistad",
            body: `${request.name} quiere unirse a tu red.`,
            data: { type: "friend-request", friendId: request.id },
          });
        });
      }

      previousPending.current = nextPending;
      didLoad.current = true;
    });

    return unsubscribe;
  }, [enabled, userUid]);
};
