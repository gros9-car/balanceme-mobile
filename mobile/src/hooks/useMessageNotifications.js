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
import { sendLocalNotification } from "./useNotificationSetup";

// Genera el identificador de chat privado en base a los UID ordenados.
const chatIdFor = (uidA, uidB) => [uidA, uidB].sort().join("_");

// Monitorea los chats aceptados para enviar notificaciones de mensajes nuevos.
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

          // Marca el chat como no leído para este usuario.
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

          sendLocalNotification({
            title: `Nuevo mensaje de ${displayName}`,
            body: payload.text?.slice(0, 140) ?? "Tienes un nuevo mensaje.",
            data: { type: "direct-message", chatId, friendUid },
          });
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
