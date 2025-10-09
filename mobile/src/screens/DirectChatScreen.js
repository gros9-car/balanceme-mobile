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
  Alert,
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
} from "firebase/firestore";

import { auth, db } from "./firebase/config";
import { useTheme } from "../context/ThemeContext";

const chatIdFor = (uidA, uidB) => [uidA, uidB].sort().join("_");

const formatDateTime = (timestamp) => {
  try {
    return timestamp.toDate().toLocaleTimeString();
  } catch (error) {
    return new Date().toLocaleTimeString();
  }
};

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

const MessageRow = ({ item, colors, currentUser }) => {
  const isUser = item.senderId === currentUser;
  const bubbleStyle = isUser
    ? styles.userBubble
    : [styles.botBubble, { backgroundColor: colors.muted }];
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
      <View
        style={[bubbleStyle, isUser && { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.messageText, { color: textColor }]}>
          {item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            { color: isUser ? colors.primaryContrast : colors.subText },
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

export default function DirectChatScreen({ navigation, route }) {
  const friendUid = route.params?.friendUid;
  const friendName = route.params?.friendName ?? "Amigo";
  const friendEmail = route.params?.friendEmail ?? "";

  const { colors } = useTheme();
  const user = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [allowed, setAllowed] = useState(true);
  const [friendProfile, setFriendProfile] = useState({
    name: friendName,
    email: friendEmail,
  });
  const [deleting, setDeleting] = useState(false);
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
      // A falta de notificacion global, mostramos alerta local
      Alert.alert("Error", "No pudimos enviar el mensaje. Intenta nuevamente.");
    }
  };

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

  const handleDeleteChat = async () => {
    if (!user?.uid || !friendUid || deleting) {
      return;
    }
    setDeleting(true);
    try {
      const deletedCount = await deleteChatMessages();
      setMessages([]);
      Alert.alert(
        "Chat eliminado",
        deletedCount
          ? "Se borro el historial completo para ambos usuarios."
          : "No habia mensajes en esta conversacion.",
        [{ text: "Aceptar", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert("Error", "No pudimos borrar el chat. Intenta nuevamente.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteChat = () => {
    if (!user?.uid || !friendUid || deleting) {
      return;
    }
    Alert.alert(
      "Eliminar chat",
      `Esta accion borrara el historial con ${resolvedFriendName}.`,
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
        style={[styles.container, { backgroundColor: colors.background }]}
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.muted }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>
              Volver
            </Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {resolvedFriendName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
              {resolvedFriendEmail}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <TouchableOpacity
                style={[
                  styles.headerActionButton,
                  { borderColor: colors.muted },
                ]}
                onPress={confirmDeleteChat}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          renderItem={({ item }) => (
            <MessageRow item={item} colors={colors} currentUser={user.uid} />
          )}
        />

        <View style={[styles.composer, { borderTopColor: colors.muted }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.subText}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.muted },
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    padding: 20,
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
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
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
