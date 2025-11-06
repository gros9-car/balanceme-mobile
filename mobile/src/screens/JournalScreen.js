import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const user = auth.currentUser;

  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyCount, setMonthlyCount] = useState(0);

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: horizontalPadding,
      width: '100%',
      maxWidth: Math.min(920, width * 0.95),
      alignSelf: 'center',
    }),
    [horizontalPadding, width],
  );

  useEffect(() => {
    if (!user?.uid) {
      setEntries([]);
      setMonthlyCount(0);
      setLoading(false);
      return undefined;
    }

    const journalRef = collection(db, 'users', user.uid, 'journal');
    const journalQuery = query(journalRef, orderBy('createdAt', 'desc'), limit(200));

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
      navigation?.replace?.('Login');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Diario emocional</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Lleva el registro de tus experiencias y etiqueta tus emociones para analizarlas luego.
          </Text>
        </View>

        <View style={[styles.progressCard, { borderColor: colors.muted, backgroundColor: colors.surface }]}>
          <View style={styles.progressHeader}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.progressTitle, { color: colors.text }]}>
                Meta mensual: {MONTHLY_TARGET} entradas
              </Text>
              <Text style={[styles.progressSubtitle, { color: colors.subText }]}>
                Te faltan {entriesRemaining} para alcanzar el objetivo este mes.
              </Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${monthlyProgress * 100}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        <View style={[styles.editorCard, { backgroundColor: colors.surface, shadowColor: colors.outline }]}>
          <View style={styles.editorHeader}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="book-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.badgeTextBlock}>
              <Text style={[styles.badgeLabel, { color: colors.subText }]}>Nueva entrada</Text>
              <Text style={[styles.badgeValue, { color: colors.text }]}>{formatDate(new Date())}</Text>
            </View>
          </View>
          <Text style={[styles.infoText, { color: colors.subText }]}>
            Comparte lo que sentiste, lo que te ayudó o aquello que te gustaría cambiar.
          </Text>

          <View style={styles.tagSection}>
            <Text style={[styles.tagLabel, { color: colors.text }]}>Etiquetas emocionales</Text>
            <Text style={[styles.tagHelper, { color: colors.subText }]}>
              Selecciona hasta {MAX_TAGS_PER_ENTRY} etiquetas. Esto facilitará tus análisis posteriores.
            </Text>
            <View style={styles.tagGrid}>
              {EMOTIONAL_TAGS.map((tag) => {
                const active = selectedTags.includes(tag.value);
                return (
                  <TouchableOpacity
                    key={tag.value}
                    style={[
                      styles.tagChip,
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => handleToggleTag(tag.value)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: active ? colors.primaryContrast : colors.text },
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Describe tu día, tus emociones, lo que aprendiste o aquello que deseas liberar..."
            placeholderTextColor={colors.subText}
            multiline
            textAlignVertical="top"
            style={[
              styles.textArea,
              { borderColor: colors.muted, color: colors.text, backgroundColor: colors.muted },
            ]}
            editable={!saving}
          />

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primaryContrast} />
                <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>Guardando…</Text>
              </View>
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>Guardar entrada</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>Cargando entradas...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="book-outline" size={24} color={colors.subText} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>
              Empieza a escribir tu primer recuerdo del mes.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const formattedDate = formatDate(entry.createdAt);
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
              >
                <View style={styles.entryHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.entryDate, { color: colors.subText }]}>{formattedDate}</Text>
                </View>
                <Text style={[styles.entryContent, { color: colors.text }]}>{entry.content}</Text>
                {entry.tags?.length ? (
                  <View style={styles.entryTagRow}>
                    {entry.tags.map((tag) => {
                      const tagMeta = EMOTIONAL_TAGS.find((item) => item.value === tag);
                      return (
                        <View key={tag} style={[styles.entryTagChip, { borderColor: colors.muted }]}>
                          <Text style={[styles.entryTagText, { color: colors.subText }]}>
                            {tagMeta?.label ?? tag}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default JournalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 32,
    gap: 24,
    alignItems: 'stretch',
  },
  header: {
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
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
    fontSize: 16,
    fontWeight: '600',
  },
  progressSubtitle: {
    fontSize: 12,
  },
  progressBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  editorCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextBlock: {
    gap: 2,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 160,
    padding: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '500',
  },
  entryContent: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
  },
  tagSection: {
    gap: 8,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagHelper: {
    fontSize: 12,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

