import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const MONTHLY_TARGET = 10;
const MAX_TAGS_PER_ENTRY = 5;

const EMOTIONAL_TAGS = [
  { value: 'alegria', label: 'Alegría' },
  { value: 'gratitud', label: 'Gratitud' },
  { value: 'calma', label: 'Calma' },
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'estres', label: 'Estrés' },
  { value: 'tristeza', label: 'Tristeza' },
  { value: 'enojo', label: 'Enojo' },
  { value: 'energia', label: 'Energía' },
  { value: 'motivacion', label: 'Motivación' },
  { value: 'soledad', label: 'Soledad' },
  { value: 'confusion', label: 'Confusión' },
  { value: 'esperanza', label: 'Esperanza' },
  { value: 'empatia', label: 'Empatía' },
  { value: 'resiliencia', label: 'Resiliencia' },
  { value: 'autocuidado', label: 'Autocuidado' },
];

const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

const sameMonth = (date, month, year) =>
  date.getMonth() === month && date.getFullYear() === year;

const JournalScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const user = auth.currentUser;

  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyCount, setMonthlyCount] = useState(0);

  // ---- Responsividad ----
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const baseFont = isSmall ? 13 : 14;
  const horizontalPadding = Math.max(12, Math.min(24, width * 0.05));
  const textAreaMinHeight = isSmall ? 50 : 42;

  const contentStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: Math.min(920, width * 0.95),
      alignSelf: 'center',
    }),
    [width],
  );

  const keyboardVerticalOffset = Platform.select({
    ios: 80,
    android: 0,
    default: 0,
  });

  useEffect(() => {
    if (!user?.uid) {
      setEntries([]);
      setMonthlyCount(0);
      setLoading(false);
      return undefined;
    }

    const journalRef = collection(db, 'users', user.uid, 'journal');
    const journalQuery = query(
      journalRef,
      orderBy('createdAt', 'desc'),
      limit(200),
    );

    const unsubscribe = onSnapshot(
      journalQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          const timestamp = data.createdAt ?? data.createdAtServer;
          const createdAt = timestamp?.toDate ? timestamp.toDate() : new Date();
          return {
            id: docSnapshot.id,
            content: typeof data.content === 'string' ? data.content : '',
            createdAt,
            tags: Array.isArray(data.tags) ? data.tags : [],
          };
        });

        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const countThisMonth = nextEntries.filter((entry) =>
          sameMonth(entry.createdAt, month, year),
        ).length;

        setEntries(nextEntries);
        setMonthlyCount(countThisMonth);
        setLoading(false);
      },
      () => {
        setEntries([]);
        setMonthlyCount(0);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleToggleTag = (tagValue) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagValue)) {
        return prev.filter((item) => item !== tagValue);
      }
      if (prev.length >= MAX_TAGS_PER_ENTRY) {
        Alert.alert(
          'Límite alcanzado',
          `Puedes seleccionar hasta ${MAX_TAGS_PER_ENTRY} etiquetas por entrada.`,
        );
        return prev;
      }
      return [...prev, tagValue];
    });
  };

  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para escribir en tu diario.');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Contenido requerido', 'Escribe al menos una frase para guardar.');
      return;
    }
    if (!selectedTags.length) {
      Alert.alert('Selecciona etiquetas', 'Agrega al menos una etiqueta emocional.');
      return;
    }

    setSaving(true);
    try {
      const journalRef = collection(db, 'users', user.uid, 'journal');
      await addDoc(journalRef, {
        content: trimmed,
        tags: selectedTags,
        createdAt: serverTimestamp(),
      });
      setDraft('');
      setSelectedTags([]);
      Alert.alert('Entrada guardada', 'Tu nota fue registrada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tu nota. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const monthlyProgress = Math.min(1, monthlyCount / MONTHLY_TARGET);
  const entriesRemaining = Math.max(0, MONTHLY_TARGET - monthlyCount);

  const renderEntry = ({ item }) => {
    const formattedDate = formatDate(item.createdAt);
    return (
      <View
        style={[
          styles.entryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.muted,
          },
        ]}
      >
        <View style={styles.entryHeader}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.primary}
          />
          <Text
            style={[
              styles.entryDate,
              { color: colors.subText, fontSize: baseFont - 1 },
            ]}
          >
            {formattedDate}
          </Text>
        </View>
        <Text
          style={[
            styles.entryContent,
            { color: colors.text, fontSize: baseFont },
          ]}
        >
          {item.content}
        </Text>
        {item.tags?.length ? (
          <View style={styles.entryTagRow}>
            {item.tags.map((tag) => {
              const tagMeta = EMOTIONAL_TAGS.find(
                (t) => t.value === tag,
              );
              return (
                <View
                  key={tag}
                  style={[
                    styles.entryTagChip,
                    { borderColor: colors.muted },
                  ]}
                >
                  <Text
                    style={[
                      styles.entryTagText,
                      {
                        color: colors.subText,
                        fontSize: baseFont - 2,
                      },
                    ]}
                  >
                    {tagMeta?.label ?? tag}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.inner}>
          {/* LISTA + HEADER */}
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntry}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.listContent,
              contentStyle,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: isSmall ? 16 : 20,
                paddingBottom: isSmall ? 150 : 170, // espacio para el composer
              },
            ]}
            ListHeaderComponent={
              <View style={styles.headerWrapper}>
                <PageHeader
                  title="Diario emocional"
                  subtitle="Lleva el registro de tus experiencias y etiqueta tus emociones para analizarlas luego."
                />

                {/* PROGRESO MENSUAL */}
                <View
                  style={[
                    styles.progressCard,
                    {
                      borderColor: colors.muted,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <View style={styles.progressHeader}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.progressTitle,
                          { color: colors.text, fontSize: baseFont + 1 },
                        ]}
                      >
                        Meta mensual: {MONTHLY_TARGET} entradas
                      </Text>
                      <Text
                        style={[
                          styles.progressSubtitle,
                          { color: colors.subText, fontSize: baseFont - 1 },
                        ]}
                      >
                        Te faltan {entriesRemaining} para alcanzar el objetivo
                        este mes.
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${monthlyProgress * 100}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[
                      styles.centeredText,
                      { color: colors.subText, fontSize: baseFont - 1 },
                    ]}
                  >
                    Cargando entradas...
                  </Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="book-outline" size={24} color={colors.subText} />
                  <Text
                    style={[
                      styles.centeredText,
                      { color: colors.subText, fontSize: baseFont - 1 },
                    ]}
                  >
                    Empieza a escribir tu primer recuerdo del mes.
                  </Text>
                </View>
              )
            }
          />

          {/* COMPOSER ABAJO (editor) */}
          <View
            style={[
              styles.composer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.muted,
                shadowColor: colors.outline ?? '#000',
                paddingHorizontal: horizontalPadding,
                paddingVertical: isSmall ? 10 : 12,
              },
            ]}
          >
            <View style={styles.composerHeader}>
              <View
                style={[
                  styles.badgeSmall,
                  { backgroundColor: colors.primary + '22' },
                ]}
              >
                <Ionicons name="book-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text
                  style={[
                    styles.badgeLabel,
                    { color: colors.subText, fontSize: baseFont - 1 },
                  ]}
                >
                  Nueva entrada
                </Text>
                <Text
                  style={[
                    styles.badgeValue,
                    { color: colors.text, fontSize: baseFont },
                  ]}
                >
                  {formatDate(new Date())}
                </Text>
              </View>
            </View>

            <View style={styles.tagSection}>
              <Text
                style={[
                  styles.tagLabel,
                  { color: colors.text, fontSize: baseFont },
                ]}
              >
                Etiquetas emocionales
              </Text>
              <View style={styles.tagGrid}>
                {EMOTIONAL_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag.value);
                  return (
                    <TouchableOpacity
                      key={tag.value}
                      style={[
                        styles.tagChip,
                        { borderColor: colors.muted },
                        active && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleToggleTag(tag.value)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          {
                            color: active ? colors.primaryContrast : colors.text,
                            fontSize: baseFont - 1,
                          },
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Describe tu día, tus emociones, lo que aprendiste o aquello que deseas liberar..."
                placeholderTextColor={colors.subText}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textArea,
                  {
                    borderColor: 'transparent',
                    color: colors.text,
                    backgroundColor: 'rgba(148,163,184,0.15)',
                    minHeight: textAreaMinHeight,
                    maxHeight: isTablet ? 110 : 100,
                    fontSize: baseFont,
                    paddingVertical: 3,
                  },
                ]}
                editable={!saving}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving ? 0.7 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryContrast} />
                ) : (
                  <Ionicons name="save-outline" size={18} color={colors.primaryContrast} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default JournalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    gap: 16,
  },
  headerWrapper: {
    gap: 16,
    marginBottom: 4,
  },
  // Progreso mensual
  progressCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  progressTitle: {
    fontWeight: '600',
  },
  progressSubtitle: {},
  progressBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextBlock: {
    gap: 2,
  },
  badgeLabel: {
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeValue: {
    fontWeight: '600',
  },

  // Entradas
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  entryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontWeight: '500',
  },
  entryContent: {
    lineHeight: 20,
  },
  entryTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryTagChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  entryTagText: {
    fontWeight: '600',
  },

  // Composer abajo
  composer: {
    borderTopWidth: 1,
    gap: 10,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagSection: {
    gap: 6,
  },
  tagLabel: {
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textArea: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    lineHeight: 20,
  },
  saveButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});