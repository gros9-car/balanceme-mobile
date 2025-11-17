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
import PageHeader from '../components/PageHeader';
import { analyzeHabitsEntry, mapHabitCategoriesToLabels } from '../utils/habitAnalysis';
import { HABIT_TAGS, HABIT_TAG_LABEL_LOOKUP, normalizeHabitTag } from '../constants/habitTags';
import { useAppAlert } from '../context/AppAlertContext';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

const CATEGORY_BADGE_COLOR = '#22c55e';
const MAX_PRESET_SELECTION = 3;

export default function HabitsScreen({ navigation }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { showAlert } = useAppAlert();
  const user = auth.currentUser;

  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTodayEntry, setHasTodayEntry] = useState(false);

  const todayLabel = useMemo(() => formatDate(new Date()), []);
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
      setHasTodayEntry(false);
      setLoading(false);
      return undefined;
    }

    const habitsRef = collection(db, 'users', user.uid, 'habits');
    const habitsQuery = query(habitsRef, orderBy('createdAt', 'desc'), limit(120));

    const unsubscribe = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          const timestamp = data.createdAt ?? data.createdAtServer;
          const createdAt = timestamp?.toDate ? timestamp.toDate() : new Date();
          const content = typeof data.content === 'string' ? data.content : '';
          const summary = typeof data.agentSummary === 'string' ? data.agentSummary : '';
          const tips = Array.isArray(data.agentTips) ? data.agentTips : [];
          const categories = Array.isArray(data.agentCategories) ? data.agentCategories : [];
          const presetHabits = Array.isArray(data.presetHabits) ? data.presetHabits : [];

          return {
            id: docSnapshot.id,
            content,
            summary,
            tips,
            categories,
            presetHabits,
            createdAt,
          };
        });

        setEntries(nextEntries);
        const today = startOfDay(new Date()).getTime();
        const foundToday = nextEntries.some(
          (entry) => startOfDay(entry.createdAt).getTime() === today,
        );
        setHasTodayEntry(foundToday);
        setLoading(false);
      },
      () => {
        setEntries([]);
        setHasTodayEntry(false);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const toggleHabit = (value) => {
    if (hasTodayEntry) {
      return;
    }
    setSelectedHabits((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= MAX_PRESET_SELECTION) {
        return prev;
      }
      return [...prev, value];
    });
  };

  const handleSave = async () => {
    if (!user?.uid) {
      showAlert({
        title: 'Sesion requerida',
        message: 'Inicia sesion para registrar tus habitos.',
        onConfirm: () => {
          navigation?.replace?.('Login');
        },
      });
      return;
    }

    const trimmed = draft.trim();
    if (!selectedHabits.length && !trimmed) {
      showAlert({
        title: 'Seleccion requerida',
        message: 'Elige al menos un habito o escribe una nota.',
      });
      return;
    }

    if (hasTodayEntry) {
      showAlert({
        title: 'Registro existente',
        message: 'Solo puedes registrar tus habitos una vez por dia.',
      });
      return;
    }

    const presetLabels = selectedHabits
      .map((value) => HABIT_TAG_LABEL_LOOKUP[value])
      .filter(Boolean);
    const contentParts = [];
    if (presetLabels.length) {
      contentParts.push(`Habitos realizados: ${presetLabels.join(', ')}`);
    }
    if (trimmed) {
      contentParts.push(trimmed);
    }
    const normalizedContent = contentParts.join('. ');
    const agentResponse = analyzeHabitsEntry(normalizedContent);

    setSaving(true);
    try {
      const habitsRef = collection(db, 'users', user.uid, 'habits');
      await addDoc(habitsRef, {
        content: normalizedContent,
        presetHabits: selectedHabits,
        agentSummary: agentResponse.summary,
        agentTips: agentResponse.tips,
        agentCategories: agentResponse.categories ?? [],
        createdAt: serverTimestamp(),
      });
      setDraft('');
      setSelectedHabits([]);
      showAlert({
        title: 'Habitos registrados',
        message: 'Tu entrada fue analizada y guardada correctamente.',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'No pudimos guardar tus habitos. Intenta nuevamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user?.uid) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.subText} />
          <Text style={[styles.centeredText, { color: colors.subText }]}>
            Inicia sesion para gestionar tus habitos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const presetLimitReached = selectedHabits.length >= MAX_PRESET_SELECTION;
  const disableSubmit = saving || hasTodayEntry;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Habitos diarios"
          subtitle="Escribe como cuidaste tu bienestar hoy y recibe sugerencias."
        />

        <View
          style={[
            styles.editorCard,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <View style={styles.editorHeader}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.badgeTextBlock}>
              <Text style={[styles.badgeLabel, { color: colors.subText }]}>Habitos de hoy</Text>
              <Text style={[styles.badgeValue, { color: colors.text }]}>{todayLabel}</Text>
            </View>
          </View>
          {hasTodayEntry ? (
            <Text style={[styles.infoText, { color: colors.subText }]}>
              Ya registraste tus habitos del dia. Manana tendremos nuevas sugerencias para ti.
            </Text>
          ) : (
            <Text style={[styles.infoText, { color: colors.subText }]}>
              Selecciona los habitos que realizaste hoy y complementa con detalles si lo deseas.
            </Text>
          )}
          <View style={styles.presetSection}>
            <View style={styles.presetHeader}>
              <Text style={[styles.presetTitle, { color: colors.text }]}>Habitos frecuentes</Text>
              <Text style={[styles.presetCounter, { color: colors.subText }]}>
                {selectedHabits.length}/{MAX_PRESET_SELECTION}
              </Text>
            </View>
            <Text style={[styles.presetHelper, { color: colors.subText }]}>
              {hasTodayEntry
                ? 'Espera al dia siguiente para registrar nuevos habitos.'
                : 'Toca para marcar lo que realizaste. Puedes seleccionar hasta tres opciones.'}
            </Text>
            <View style={styles.presetGrid}>
              {HABIT_TAGS.map((preset) => {
                const isSelected = selectedHabits.includes(preset.value);
                const disabled = hasTodayEntry;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.presetChip,
                      { borderColor: colors.muted, backgroundColor: colors.muted },
                      isSelected && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '22',
                      },
                    ]}
                    onPress={() => (!isSelected && presetLimitReached ? null : toggleHabit(preset.value))}
                    disabled={disabled}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.presetChipLabel,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text style={[styles.presetChipDescription, { color: colors.subText }]}>
                      {preset.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Agrega un detalle breve o reflexion adicional (opcional)."
            placeholderTextColor={colors.subText}
            multiline
            textAlignVertical="top"
            style={[
              styles.textArea,
              { borderColor: colors.muted, color: colors.text, backgroundColor: colors.muted },
            ]}
            editable={!hasTodayEntry}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              disableSubmit && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={disableSubmit}
            activeOpacity={0.9}
          >
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primaryContrast} />
                <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>
                  Guardando...
                </Text>
              </View>
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>
                Guardar habitos
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.timelineHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Entradas anteriores</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>
              Cargando habitos...
            </Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="leaf-outline" size={24} color={colors.subText} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>
              Todavia no registras habitos.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const formatted = formatDate(entry.createdAt);
            const categoryLabels = mapHabitCategoriesToLabels(entry.categories);
            const presetLabels = Array.isArray(entry.presetHabits)
              ? entry.presetHabits
                  .map((value) => normalizeHabitTag(value))
                  .filter(Boolean)
                  .map((value) => HABIT_TAG_LABEL_LOOKUP[value] ?? value)
              : [];
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
              >
                <View style={styles.entryHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.entryDate, { color: colors.subText }]}>{formatted}</Text>
                </View>
                {presetLabels.length ? (
                  <View style={styles.presetRow}>
                    {presetLabels.map((label) => (
                      <View
                        key={label}
                        style={[
                          styles.presetBadge,
                          { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
                        ]}
                      >
                        <Text style={[styles.presetBadgeText, { color: colors.primary }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={[styles.entryContent, { color: colors.text }]}>{entry.content}</Text>
                {entry.summary ? (
                  <View style={[styles.agentCard, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.agentTitle, { color: colors.text }]}>
                      Resumen de tus habitos
                    </Text>
                    {categoryLabels.length ? (
                      <View style={styles.categoryRow}>
                        {categoryLabels.map((label) => (
                          <View key={label} style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <Text style={[styles.agentSummary, { color: colors.text }]}>{entry.summary}</Text>
                    {entry.tips.map((tip) => (
                      <View key={tip} style={styles.tipRow}>
                        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                        <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 140,
    padding: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  presetSection: {
    gap: 12,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetCounter: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetHelper: {
    fontSize: 13,
    lineHeight: 18,
  },
  presetGrid: {
    gap: 12,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  presetChipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetChipDescription: {
    fontSize: 12,
    lineHeight: 16,
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
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  agentCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  agentTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: CATEGORY_BADGE_COLOR + '22',
    borderWidth: 1,
    borderColor: CATEGORY_BADGE_COLOR,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: CATEGORY_BADGE_COLOR,
  },
  agentSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
