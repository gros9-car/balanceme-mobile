import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const FORUM_CATEGORIES = [
  { value: 'apoyo', label: 'Apoyo emocional' },
  { value: 'recursos', label: 'Recursos y tips' },
  { value: 'logros', label: 'Historias de avance' },
];

const formatTimestamp = (value) => {
  try {
    return value.toDate().toLocaleString();
  } catch (error) {
    return new Date().toLocaleString();
  }
};

const buildAlias = (uid) => {
  if (!uid) {
    return 'Anónimo';
  }
  const suffix = uid.slice(-4).toUpperCase();
  return `Anónimo-${suffix}`;
};

const HelpForumScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState(FORUM_CATEGORIES[0].value);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // ---- Responsividad ----
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const baseFont = isSmall ? 13 : 14;
  const headerTitleFont = isSmall ? 18 : 20;
  const headerSubtitleFont = isSmall ? 11 : 12;

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const maxContentWidth = Math.min(920, width * 0.95);

  const contentWidth = useMemo(
    () => ({
      paddingHorizontal: horizontalPadding,
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      gap: 24,
    }),
    [horizontalPadding, maxContentWidth],
  );

  const keyboardVerticalOffset = Platform.select({
    ios: insets.top + 60,
    android: 0,
    default: 0,
  });

  useEffect(() => {
    const forumRef = collection(db, 'forumPosts');
    const forumQuery = query(forumRef, orderBy('createdAt', 'desc'), limit(200));

    const unsubscribe = onSnapshot(
      forumQuery,
      (snapshot) => {
        const next = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          return {
            id: docSnapshot.id,
            alias: typeof data.alias === 'string' ? data.alias : 'Anónimo',
            message: typeof data.message === 'string' ? data.message : '',
            category:
              typeof data.category === 'string'
                ? data.category
                : FORUM_CATEGORIES[0].value,
            createdAt: data.createdAt ?? data.createdAtServer,
            createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            reports: Array.isArray(data.reports) ? data.reports : [],
          };
        });
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

  const handlePublish = async () => {
    if (!user?.uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para participar en la comunidad.');
      navigation?.replace?.('Login');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Mensaje vacío', 'Escribe un mensaje antes de publicar.');
      return;
    }

    setPosting(true);
    try {
      const forumRef = collection(db, 'forumPosts');
      await addDoc(forumRef, {
        alias: buildAlias(user.uid),
        message: trimmed,
        category,
        createdAt: serverTimestamp(),
        reports: [],
      });
      setDraft('');
      Alert.alert('Publicado', 'Tu mensaje anónimo ya es visible.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos publicar el mensaje. Intenta nuevamente.');
    } finally {
      setPosting(false);
    }
  };

  const handleReport = async (postId) => {
    if (!user?.uid) {
      Alert.alert('Acción no disponible', 'Inicia sesión para reportar contenidos.');
      return;
    }
    try {
      const postRef = doc(db, 'forumPosts', postId);
      await updateDoc(postRef, {
        reports: arrayUnion(user.uid),
      });
      Alert.alert(
        'Reporte enviado',
        'Gracias por ayudarnos a mantener un espacio seguro.',
      );
    } catch (error) {
      Alert.alert('Error', 'No pudimos enviar el reporte. Intenta de nuevo.');
    }
  };

  const renderItem = ({ item }) => {
    const categoryMeta = FORUM_CATEGORIES.find((c) => c.value === item.category);
    return (
      <View
        style={[
          styles.postCard,
          { backgroundColor: colors.surface, borderColor: colors.muted },
        ]}
      >
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            <View>
              <Text style={[styles.postAlias, { color: colors.text }]}>
                {item.alias}
              </Text>
              <Text style={[styles.postDate, { color: colors.subText }]}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.primary + '22' },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
              {categoryMeta?.label ?? 'Discusión'}
            </Text>
          </View>
        </View>
        <Text style={[styles.postMessage, { color: colors.text }]}>
          {item.message}
        </Text>
        <View style={styles.postFooter}>
          <TouchableOpacity
            style={[styles.reportButton, { borderColor: colors.muted }]}
            onPress={() => handleReport(item.id)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="flag-outline"
              size={16}
              color={colors.danger ?? '#ef4444'}
            />
            <Text
              style={[
                styles.reportText,
                { color: colors.danger ?? '#ef4444' },
              ]}
            >
              Reportar
            </Text>
          </TouchableOpacity>
          {item.reports?.length ? (
            <Text style={[styles.reportCount, { color: colors.subText }]}>
              {item.reports.length} reportes
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View
          style={{
            paddingHorizontal: horizontalPadding,
            paddingVertical: isSmall ? 12 : 16,
          }}
        >
          <PageHeader
            title="Comunidad anónima"
            subtitle="Comparte de forma segura. Recuerda que todo lo publicado se mantiene en anonimato."
          />
        </View>

        {/* COMPOSER RESPONSIVO */}
        <View
          style={[
            styles.composer,
            {
              borderBottomColor: colors.muted,
              paddingHorizontal: horizontalPadding,
              paddingVertical: isSmall ? 12 : 16,
            },
          ]}
        >
          <View style={styles.categorySelector}>
            {FORUM_CATEGORIES.map((item) => {
              const active = category === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.categoryChip,
                    { borderColor: colors.muted },
                    active && { backgroundColor: colors.primary, borderColor: 'transparent' },
                  ]}
                  onPress={() => setCategory(item.value)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: active ? colors.primaryContrast : colors.text,
                        fontSize: baseFont - 1,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje de apoyo, una duda o un recurso útil..."
            placeholderTextColor={colors.subText}
            style={[
              styles.input,
              {
                color: colors.text,
                fontSize: baseFont,
                minHeight: isSmall ? 72 : 80,
                maxHeight: isTablet ? 220 : 160,
              },
            ]}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity: posting ? 0.7 : 1,
              },
            ]}
            onPress={handlePublish}
            disabled={posting}
            activeOpacity={0.85}
          >
            {posting ? (
              <ActivityIndicator size="small" color={colors.primaryContrast} />
            ) : (
              <Ionicons name="send" size={18} color={colors.primaryContrast} />
            )}
          </TouchableOpacity>
        </View>

        {/* LISTA RESPONSIVA */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, contentWidth]}
          renderItem={renderItem}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: colors.subText, fontSize: baseFont - 1 },
                  ]}
                >
                  Cargando mensajes...
                </Text>
              </View>
            ) : (
              <View style={styles.loading}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color={colors.subText}
                />
                <Text
                  style={[
                    styles.loadingText,
                    { color: colors.subText, fontSize: baseFont - 1 },
                  ]}
                >
                  Aún no hay publicaciones. ¡Se el primero en compartir algo!
                </Text>
              </View>
            )
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HelpForumScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  composer: {
    gap: 12,
    borderBottomWidth: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(148,163,184,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    lineHeight: 20,
  },
  sendButton: {
    alignSelf: 'flex-end',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: {
    paddingVertical: 24,
    gap: 16,
  },
  loading: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    textAlign: 'center',
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAlias: {
    fontWeight: '600',
  },
  postDate: {
    fontSize: 11,
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reportText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportCount: {
    fontSize: 11,
  },
});
