import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  limit,
  setDoc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { auth, db } from "./firebase/config";
import { useTheme } from "../context/ThemeContext";
import PageHeader from "../components/PageHeader";
import { useAppAlert } from "../context/AppAlertContext";
import { formatTimeHM } from "../utils/dateTimeFormat";

// === Hook de responsividad específico para el chat ===
const useResponsiveChat = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const horizontalPadding = isSmall ? 12 : 20;
  const headerVerticalPadding = isSmall ? 10 : 14;
  const composerVerticalPadding = isSmall ? 10 : 16;

  const bubbleMaxWidth = isTablet ? "60%" : "75%";
  const baseFont = isSmall ? 13 : 14;
  const headerTitleFont = isSmall ? 16 : 18;
  const headerSubtitleFont = isSmall ? 11 : 12;

  // Limita cuánto puede crecer el TextInput con el teclado abierto
  const inputMaxHeight = Math.max(80, height * 0.22);

  const keyboardVerticalOffset = Platform.select({
    ios: insets.top + 52, // status bar + header
    android: 0,
    default: 0,
  });

  return {
    width,
    height,
    isSmall,
    isTablet,
    horizontalPadding,
    headerVerticalPadding,
    composerVerticalPadding,
    bubbleMaxWidth,
    baseFont,
    headerTitleFont,
    headerSubtitleFont,
    inputMaxHeight,
    keyboardVerticalOffset,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
};

// Genera un identificador de chat único ordenando ambos UID.
const chatIdFor = (uidA, uidB) => [uidA, uidB].sort().join("_");

// Convierte un timestamp de Firestore en una hora legible (HH:MM, sin segundos).
const formatDateTime = (timestamp) => {
  try {
    return formatTimeHM(timestamp);
  } catch (error) {
    return formatTimeHM(new Date());
  }
};

// Obtiene un perfil simplificado priorizando nombre y correo.
const deriveProfile = (data = {}) => {
  const nameCandidate = typeof data.name === "string" ? data.name.trim() : "";
  const displayCandidate =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  const emailCandidate =
    typeof data.email === "string" ? data.email.trim() : "";
  const fallbackName = emailCandidate ? emailCandidate.split("@")[0] : "Amigo";
  return {
    name: nameCandidate || displayCandidate || fallbackName,
    email: emailCandidate,
  };
};

// Renderiza cada burbuja de mensaje adaptándose al remitente actual.
const MessageRow = ({
  item,
  colors,
  currentUser,
  bubbleMaxWidth,
  baseFont,
}) => {
  const isUser = item.senderId === currentUser;

  const bubbleBase = isUser ? styles.userBubble : styles.botBubble;
  const bubbleStyle = [
    bubbleBase,
    {
      maxWidth: bubbleMaxWidth,
      padding: baseFont, // se adapta un poco al tamaño base
      backgroundColor: isUser ? colors.primary : colors.muted,
    },
  ];
  const textColor = isUser ? colors.primaryContrast : colors.text;

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowFriend,
      ]}
    >
      {!isUser ? (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}
        >
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={bubbleStyle}>
        <Text
          style={[
            styles.messageText,
            { color: textColor, fontSize: baseFont, lineHeight: baseFont * 1.45 },
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            {
              color: isUser ? colors.primaryContrast : colors.subText,
              fontSize: baseFont - 3,
            },
          ]}
        >
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
      {isUser ? (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}
        >
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

// Chat directo entre dos usuarios que valida amistad y sincroniza mensajes.
/**
 * Pantalla de chat directo entre dos usuarios.
 * Muestra el historial de mensajes en tiempo real usando Firestore
 * y permite enviar, borrar y marcar mensajes como leídos.
 */
export default function DirectChatScreen({ navigation, route }) {
  const friendUid = route.params?.friendUid;
  const friendName = route.params?.friendName ?? "Amigo";
  const friendEmail = route.params?.friendEmail ?? "";

  const { colors } = useTheme();
  const { showAlert } = useAppAlert();
  const user = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [allowed, setAllowed] = useState(true);
  const [friendProfile, setFriendProfile] = useState({
    name: friendName,
    email: friendEmail,
  });
  const [deleting, setDeleting] = useState(false);

  const {
    isSmall,
    horizontalPadding,
    headerVerticalPadding,
    composerVerticalPadding,
    bubbleMaxWidth,
    baseFont,
    headerTitleFont,
    headerSubtitleFont,
    inputMaxHeight,
    keyboardVerticalOffset,
    safeTop,
    safeBottom,
  } = useResponsiveChat();

  const resolvedFriendName = useMemo(
    () => friendProfile?.name ?? friendName,
    [friendProfile?.name, friendName],
  );
  const resolvedFriendEmail = useMemo(
    () => friendProfile?.email ?? friendEmail,
    [friendProfile?.email, friendEmail],
  );

  const listRef = useRef(null);

  useEffect(() => {
    // Verifica en Firestore que la amistad esté aceptada antes de habilitar el chat.
    const verifyFriendship = async () => {
      if (!user?.uid || !friendUid) {
        setAllowed(false);
        return;
      }
      try {
        const ref = doc(db, "users", user.uid, "friendships", friendUid);
        const snapshot = await getDoc(ref);
        const status = snapshot.data()?.status;
        setAllowed(status === "accepted");
      } catch (error) {
        setAllowed(false);
      }
    };

    verifyFriendship();
  }, [user?.uid, friendUid]);

  useEffect(() => {
    // Escucha cambios del perfil del amigo para mantener nombre y correo actualizados.
    if (!friendUid) {
      return undefined;
    }

    const friendRef = doc(db, "users", friendUid);
    const unsubscribe = onSnapshot(friendRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setFriendProfile(deriveProfile(data));
      }
    });

    return unsubscribe;
  }, [friendUid]);

  useEffect(() => {
    // Suscribe la colección de mensajes para recibir actualizaciones en tiempo real.
    if (!user?.uid || !friendUid) {
      return undefined;
    }

    const chatId = chatIdFor(user.uid, friendUid);
    const messagesRef = collection(db, "privateChats", chatId, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() ?? {}),
      }));
      setMessages(next);
    });

    return unsubscribe;
  }, [user?.uid, friendUid]);

  // Marca el chat como leído para el usuario actual cuando ve los mensajes.
  const lastMarkedReadRef = useRef(null);

  useEffect(() => {
    if (!user?.uid || !friendUid || !messages.length) {
      return;
    }

    const latest = messages[0];
    if (!latest?.id) {
      return;
    }

    if (lastMarkedReadRef.current === latest.id) {
      return;
    }

    lastMarkedReadRef.current = latest.id;

    const friendshipRef = doc(db, "users", user.uid, "friendships", friendUid);
    setDoc(
      friendshipRef,
      {
        unread: false,
        unreadCount: 0,
        lastReadMessageId: latest.id,
        lastReadAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => undefined);
  }, [messages, user?.uid, friendUid]);

  // Publica un mensaje si ambos usuarios son válidos y hay texto.
  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !user?.uid || !friendUid) {
      return;
    }

    const chatId = chatIdFor(user.uid, friendUid);
    const messagesRef = collection(db, "privateChats", chatId, "messages");

    try {
      await addDoc(messagesRef, {
        text: trimmed,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });
      setDraft("");
    } catch (error) {
      showAlert("Error", "No pudimos enviar el mensaje. Intenta nuevamente.");
    }
  };

  // Elimina todos los mensajes del chat iterando en lotes seguros.
  const deleteChatMessages = async () => {
    if (!user?.uid || !friendUid) {
      return 0;
    }
    const chatId = chatIdFor(user.uid, friendUid);
    const messagesRef = collection(db, "privateChats", chatId, "messages");
    let removed = 0;

    while (true) {
      const snapshot = await getDocs(query(messagesRef, limit(500)));
      if (snapshot.empty) {
        break;
      }
      const batch = writeBatch(db);
      snapshot.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
      removed += snapshot.size;
    }

    try {
      await deleteDoc(doc(db, "privateChats", chatId));
    } catch (error) {
      // Silenciamos errores si el documento raiz no existe
    }

    return removed;
  };

  // Ejecuta la eliminación completa del historial y notifica al usuario.
  const handleDeleteChat = async () => {
    if (!user?.uid || !friendUid || deleting) {
      return;
    }
    setDeleting(true);
    try {
      const deletedCount = await deleteChatMessages();
      setMessages([]);
      showAlert(
        "Chat eliminado",
        deletedCount
          ? "Se borró el historial completo para ambos usuarios."
          : "No había mensajes en esta conversación.",
        [{ text: "Aceptar", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      showAlert("Error", "No pudimos borrar el chat. Intenta nuevamente.");
    } finally {
      setDeleting(false);
    }
  };

  // Solicita confirmación antes de borrar el historial para ambos.
  const confirmDeleteChat = () => {
    if (!user?.uid || !friendUid || deleting) {
      return;
    }
    showAlert(
      "Eliminar chat",
      `Esta acción borrará el historial con ${resolvedFriendName}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => handleDeleteChat(),
        },
      ],
    );
  };

  if (!user?.uid) {
    return null;
  }

  if (!allowed) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: safeTop,
            paddingBottom: safeBottom,
          },
        ]}
      >
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.background}
        />
        <View style={styles.centered}>
          <Ionicons name="shield-outline" size={26} color={colors.subText} />
          <Text style={[styles.centeredText, { color: colors.subText }]}>
            Necesitan ser amigos para conversar.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop,
          paddingBottom: safeBottom,
        },
      ]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View
          style={{
            paddingHorizontal: horizontalPadding,
            paddingVertical: headerVerticalPadding,
          }}
        >
          <PageHeader
            title={resolvedFriendName}
            subtitle={resolvedFriendEmail}
            rightContent={
              deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <TouchableOpacity
                  style={[styles.headerActionButton, { borderColor: colors.muted }]}
                  onPress={confirmDeleteChat}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              )
            }
          />
        </View>

        {/* LISTA DE MENSAJES RESPONSIVA */}
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: horizontalPadding,
              paddingBottom: horizontalPadding / 2,
            },
          ]}
          renderItem={({ item }) => (
            <MessageRow
              item={item}
              colors={colors}
              currentUser={user.uid}
              bubbleMaxWidth={bubbleMaxWidth}
              baseFont={baseFont}
            />
          )}
        />

        {/* BARRA DE TEXTO RESPONSIVA */}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.muted,
              paddingHorizontal: horizontalPadding,
              paddingVertical: composerVerticalPadding,
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.subText}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.muted,
                paddingHorizontal: isSmall ? 12 : 16,
                paddingVertical: isSmall ? 8 : 10,
                maxHeight: inputMaxHeight,
                fontSize: baseFont,
              },
            ]}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity: draft.trim() ? 1 : 0.6,
              },
            ]}
            onPress={handleSend}
            disabled={!draft.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color={colors.primaryContrast} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  messagesContent: {
    paddingBottom: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowFriend: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userBubble: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageText: {},
  messageTime: {
    marginTop: 6,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  centeredText: {
    fontSize: 14,
    textAlign: "center",
  },
});
