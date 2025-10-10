import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, doc } from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

// Garantiza fechas legibles incluso si el timestamp es inválido.
const formatTimestamp = (value) => {
  try {
    return value.toDate().toLocaleString();
  } catch (error) {
    return new Date().toLocaleString();
  }
};

// Deriva un perfil simple para mostrar autor y correo en el foro.
const deriveProfile = (data) => {
  const nameCandidate =
    (typeof data?.name === 'string' && data.name.trim()) ||
    (typeof data?.displayName === 'string' && data.displayName.trim());
  const emailCandidate = typeof data?.email === 'string' ? data.email : '';
  const fallbackName = emailCandidate ? emailCandidate.split('@')[0] : 'Usuario';
  return {
    name: nameCandidate ?? fallbackName,
    email: emailCandidate,
  };
};

// Foro comunitario que permite publicar mensajes y ver aportes recientes.
export default function HelpForumScreen({ navigation }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const user = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const profileSubscriptions = useRef({});

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const displayName = useMemo(() => {
    if (user?.displayName?.trim()) {
      return user.displayName.trim();
    }
    if (user?.email?.trim()) {
      return user.email.trim().split('@')[0];
    }
    return 'Anonimo';
  }, [user?.displayName, user?.email]);

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const contentWidth = useMemo(() => ({
    paddingHorizontal: horizontalPadding,
    width: '100%',
    maxWidth: Math.min(920, width * 0.95),
    alignSelf: 'center',
    gap: 24,
  }), [horizontalPadding, width]);

  useEffect(() => () => {
    // Limpia las suscripciones a perfiles cuando se desmonta la pantalla.
    Object.values(profileSubscriptions.current).forEach((unsubscribe) => unsubscribe?.());
    profileSubscriptions.current = {};
  }, []);

  // Escucha los cambios del perfil de un usuario y cachea su info.
  const attachProfileListener = (uid) => {
    if (!uid || profileSubscriptions.current[uid]) {
      return;
    }
    profileSubscriptions.current[uid] = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const data = snapshot.data();
      setProfiles((prev) => ({ ...prev, [uid]: deriveProfile(data ?? {}) }));
    });
  };

  useEffect(() => {
    // Recupera los mensajes más recientes del foro y vincula los perfiles involucrados.
    const forumRef = collection(db, 'forumPosts');
    const forumQuery = query(forumRef, orderBy('createdAt', 'desc'), limit(200));

    const unsubscribe = onSnapshot(
      forumQuery,
      (snapshot) => {
        const uniqueUserIds = new Set();
        const next = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          if (data.userId) {
            uniqueUserIds.add(data.userId);
          }
          return {
            id: docSnapshot.id,
            author: typeof data.author === 'string' ? data.author : 'Anonimo',
            message: typeof data.message === 'string' ? data.message : '',
            createdAt: data.createdAt ?? data.createdAtServer,
            userId: data.userId,
          };
        });
        uniqueUserIds.forEach(attachProfileListener);
        setMessages(next);
        setLoading(false);
      },
      () => {
        setMessages([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Publica un nuevo mensaje en el foro si el usuario está autenticado.
  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (!user?.uid) {
      Alert.alert('Sesion requerida', 'Necesitas iniciar sesion para participar.');
      navigation?.replace?.('Login');
      return;
    }

    setPosting(true);
    try {
      const forumRef = collection(db, 'forumPosts');
      attachProfileListener(user.uid);
      await addDoc(forumRef, {
        author: displayName,
        message: trimmed,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setDraft('');
    } catch (error) {
      Alert.alert('Error', 'No pudimos publicar tu mensaje. Intenta nuevamente.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.muted }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Foro de ayuda</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>Comparte experiencias y motivacion con la comunidad BalanceMe.</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, contentWidth]}
          ListHeaderComponent={
            <View style={[styles.composer, { borderTopColor: colors.muted, backgroundColor: colors.surface, shadowColor: colors.outline }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={user ? 'Escribe un mensaje para la comunidad...' : 'Inicia sesion para participar'}
                placeholderTextColor={colors.subText}
                editable={Boolean(user)}
                style={[styles.input, { color: colors.text, borderColor: colors.muted }]}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary, opacity: posting || !user ? 0.6 : 1 }]}
                onPress={handleSend}
                disabled={posting || !user}
                activeOpacity={0.85}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={colors.primaryContrast} />
                ) : (
                  <Ionicons name="send" size={18} color={colors.primaryContrast} />
                )}
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.centered}>
                <Ionicons name="people-outline" size={24} color={colors.subText} />
                <Text style={[styles.centeredText, { color: colors.subText }]}>Aun no hay publicaciones.</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const profile = item.userId ? profiles[item.userId] : undefined;
            const author = profile?.name ?? item.author;
            return (
              <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
                <View style={styles.postHeader}>
                  <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                  <View style={styles.postHeaderText}>
                    <Text style={[styles.postAuthor, { color: colors.text }]}>{author}</Text>
                    <Text style={[styles.postDate, { color: colors.subText }]}>{formatTimestamp(item.createdAt)}</Text>
                  </View>
                </View>
                <Text style={[styles.postMessage, { color: colors.text }]}>{item.message}</Text>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 32,
    gap: 16,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postHeaderText: {
    gap: 2,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  postMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
