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
import { formatDateTimeShort } from '../utils/dateTimeFormat';

const FORUM_CATEGORIES = [
  { value: 'apoyo', label: 'Apoyo emocional' },
  { value: 'recursos', label: 'Recursos y tips' },
  { value: 'logros', label: 'Historias de avance' },
];

const formatTimestamp = (value) => formatDateTimeShort(value);

const buildAlias = (uid) => {
  if (!uid) return 'Anónimo';
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

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const maxContentWidth = Math.min(920, width * 0.95);

  const contentWidth = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
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
      await updateDoc(postRef, { reports: arrayUnion(user.uid) });
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
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
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

  const aliasPreview = buildAlias(user?.uid);

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
        <View style={styles.inner}>
          {/* LISTA + HEADER DENTRO DEL SCROLL */}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.listContent,
              contentWidth,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: isSmall ? 8 : 12,
                paddingBottom: isSmall ? 140 : 160, // espacio para el composer
              },
            ]}
            renderItem={renderItem}
            ListHeaderComponent={
              <View style={styles.headerWrapper}>
                <PageHeader
                  title="Comunidad anónima"
                  subtitle="Comparte de forma segura. Todo lo que publiques se mantiene en anonimato."
                />
                <Text
                  style={[
                    styles.aliasHelper,
                    { color: colors.subText, fontSize: baseFont - 1 },
                  ]}
                >
                  Publicas como <Text style={{ fontWeight: '600' }}>{aliasPreview}</Text>
                </Text>
              </View>
            }
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
                    Aún no hay publicaciones. Sé la primera persona en compartir algo.
                  </Text>
                </View>
              )
            }
          />

          {/* COMPOSER ANCLADO ABAJO */}
          <View
            style={[
              styles.composer,
              {
                borderTopColor: colors.muted,
                backgroundColor: colors.background,
                paddingHorizontal: horizontalPadding,
                paddingVertical: isSmall ? 10 : 12,
                shadowColor: colors.outline ?? '#000',
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
                      active && {
                        backgroundColor: colors.primary,
                        borderColor: 'transparent',
                      },
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

            <View style={styles.inputRow}>
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
                    minHeight: isSmall ? 44 : 48,
                    maxHeight: isTablet ? 140 : 110,
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HelpForumScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  headerWrapper: {
    marginBottom: 12,
    gap: 6,
  },
  aliasHelper: {
    textAlign: 'left',
  },
  listContent: {
    flexGrow: 1,
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

  // COMPOSER ABAJO
  composer: {
    borderTopWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(148,163,184,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});