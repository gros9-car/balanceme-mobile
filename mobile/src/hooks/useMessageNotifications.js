import { AppState } from "react-native";
import { useEffect, useRef } from "react";
import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { navigationRef } from "../navigation/navigationRef";
import { sendLocalNotification } from "./useNotificationSetup";
import { db } from "../screens/firebase/config";

const chatIdFor = (uidA, uidB) => [uidA, uidB].sort().join("_");
const PREVIEW_LIMIT = 120;

const buildPreview = (text) => {
  if (typeof text !== "string") {
    return "Tienes un nuevo mensaje";
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return "Tienes un nuevo mensaje";
  }
  if (trimmed.length <= PREVIEW_LIMIT) {
    return trimmed;
  }
  return `${trimmed.slice(0, PREVIEW_LIMIT)}…`;
};

const isChatOpen = (friendUid) => {
  const route = navigationRef.getCurrentRoute?.();
  if (!route || route.name !== "DirectChat") {
    return false;
  }
  const routeFriendUid = route.params?.friendUid;
  return Boolean(routeFriendUid && routeFriendUid === friendUid);
};

const shouldShowLocalNotification = () => AppState.currentState === "active";

/**
 * Hook que observa en tiempo real los chats privados con amistades aceptadas,
 * actualiza flags de no leido/unreadCount y dispara notificaciones locales
 * cuando llegan mensajes nuevos del otro usuario.
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
            email: data.email ?? "",
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
        const existing = friendStateRef.current.get(friendUid);
        if (subscriptionsRef.current[friendUid]) {
          friendStateRef.current.set(friendUid, {
            ...existing,
            name: meta.name,
            email: meta.email,
          });
          return;
        }

        const chatId = chatIdFor(userUid, friendUid);
        const messagesRef = collection(db, "privateChats", chatId, "messages");
        const messagesQuery = query(
          messagesRef,
          orderBy("createdAt", "desc"),
          limit(20),
        );

        const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
          const state = friendStateRef.current.get(friendUid) ?? {};
          const latest = messagesSnapshot.docs[0];
          const nextState = {
            ...state,
            loaded: true,
            lastMessageId: latest?.id ?? state.lastMessageId ?? null,
            name: meta.name,
            email: meta.email,
          };

          messagesSnapshot.docChanges().forEach((change) => {
            if (change.type !== "added") {
              return;
            }

            const payload = change.doc.data() ?? {};
            const senderId = payload.senderId;
            const messageId = change.doc.id;

            if (!senderId || senderId === userUid) {
              nextState.lastMessageId = messageId;
              return;
            }

            // Evita duplicados por la primera carga del listener.
            if (!state.loaded) {
              nextState.lastMessageId = messageId;
              return;
            }

            const chatVisible = isChatOpen(friendUid);
            if (!chatVisible) {
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
                  unreadCount: increment(1),
                  lastUnreadMessageId: messageId,
                  lastMessagePreview: buildPreview(payload.text),
                  lastMessageAt: payload.createdAt ?? serverTimestamp(),
                },
                { merge: true },
              ).catch(() => undefined);

              if (shouldShowLocalNotification()) {
                const displayName = state.name ?? meta.name ?? "Amigo";
                sendLocalNotification({
                  title: displayName,
                  body: buildPreview(payload.text),
                  data: {
                    type: "NEW_MESSAGE",
                    chatId,
                    friendUid,
                    senderId,
                    senderName: displayName,
                    friendName: displayName,
                    friendEmail: state.email ?? meta.email ?? "",
                    messageId,
                  },
                });
              }
            }

            nextState.lastMessageId = messageId;
          });

          friendStateRef.current.set(friendUid, nextState);
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
