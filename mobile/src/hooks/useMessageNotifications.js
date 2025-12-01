import { useEffect, useRef } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import { db } from "../screens/firebase/config";

const chatIdFor = (uidA, uidB) => [uidA, uidB].sort().join("_");

/**
 * Hook que observa en tiempo real los chats privados con amistades aceptadas
 * y marca el documento de amistad con flags de `unread` cuando llega un mensaje
 * nuevo de la otra persona.
 *
 * No muestra el aviso directamente; solo actualiza Firestore para que la UI
 * pueda reflejar contadores o badges de mensajes no leídos.
 *
 * @param {{ enabled: boolean, userUid?: string }} params
 *   enabled controla si se suscribe; userUid es el UID del usuario.
 */
export const useMessageNotifications = ({ enabled, userUid }) => {
  const subscriptionsRef = useRef({});
  const friendStateRef = useRef(new Map());

  useEffect(() => {
    const cleanupAll = () => {
      Object.values(subscriptionsRef.current).forEach((unsubscribe) =>
        unsubscribe?.(),
      );
      subscriptionsRef.current = {};
      friendStateRef.current = new Map();
    };

    if (!enabled || !userUid) {
      cleanupAll();
      return () => {};
    }

    const friendshipsRef = collection(db, "users", userUid, "friendships");

    const unsubscribeFriendships = onSnapshot(friendshipsRef, (snapshot) => {
      const nextAccepted = new Map();

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() ?? {};
        if (data.status === "accepted") {
          nextAccepted.set(docSnapshot.id, {
            name: data.name ?? "Amigo",
          });
        }
      });

      const seenIds = new Set(nextAccepted.keys());
      Object.keys(subscriptionsRef.current).forEach((friendUid) => {
        if (!seenIds.has(friendUid)) {
          subscriptionsRef.current[friendUid]?.();
          delete subscriptionsRef.current[friendUid];
          friendStateRef.current.delete(friendUid);
        }
      });

      nextAccepted.forEach((meta, friendUid) => {
        if (subscriptionsRef.current[friendUid]) {
          const state = friendStateRef.current.get(friendUid);
          friendStateRef.current.set(friendUid, {
            ...state,
            name: meta.name,
          });
          return;
        }

        const chatId = chatIdFor(userUid, friendUid);
        const messagesRef = collection(db, "privateChats", chatId, "messages");
        const messagesQuery = query(
          messagesRef,
          orderBy("createdAt", "desc"),
          limit(1),
        );

        const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
          if (messagesSnapshot.empty) {
            const existing = friendStateRef.current.get(friendUid);
            friendStateRef.current.set(friendUid, {
              ...existing,
              loaded: true,
              lastMessageId: null,
              name: meta.name,
            });
            return;
          }

          const docSnapshot = messagesSnapshot.docs[0];
          const payload = docSnapshot.data() ?? {};
          const state = friendStateRef.current.get(friendUid) ?? {};
          const displayName = state.name ?? meta.name;
          const previousMessageId = state.lastMessageId ?? null;
          const wasLoaded = Boolean(state.loaded);

          friendStateRef.current.set(friendUid, {
            ...state,
            loaded: true,
            lastMessageId: docSnapshot.id,
            name: displayName,
          });

          if (!payload.senderId || payload.senderId === userUid) {
            return;
          }

          if (!wasLoaded) {
            return;
          }

          if (previousMessageId === docSnapshot.id) {
            return;
          }

          const friendshipRef = doc(
            db,
            "users",
            userUid,
            "friendships",
            friendUid,
          );
          setDoc(
            friendshipRef,
            {
              unread: true,
              lastUnreadMessageId: docSnapshot.id,
            },
            { merge: true },
          ).catch(() => undefined);
        });

        subscriptionsRef.current[friendUid] = unsubscribe;
      });
    });

    return () => {
      unsubscribeFriendships();
      cleanupAll();
    };
  }, [enabled, userUid]);
};
