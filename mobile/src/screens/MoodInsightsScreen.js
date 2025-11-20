import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
} from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const DAYS_TO_FETCH = 60;

// -------------------- Helpers --------------------
const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Valence (-2..2) -> score 0..100 (interno)
const computeMoodScore = (entry) => {
  const valence = entry?.scores?.valence;
  if (typeof valence !== 'number') {
    return 50; // neutro si no hay dato
  }
  const normalized = (valence + 2) / 4; // 0..1
  const pct = Math.max(0, Math.min(1, normalized)) * 100;
  return Math.round(pct);
};

// 3 categorías: Semana difícil, Semana normal, Buena semana
const scoreToLabel = (score) => {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 33) return 'Difícil';
  if (s <= 66) return 'Normal';
  return 'Bueno';
};

const buildDailyStatsMap = (entries) => {
  const map = new Map();

  entries.forEach((entry) => {
    const dateKey = formatDateKey(startOfDay(entry.date));
    const score = computeMoodScore(entry);
    const prev = map.get(dateKey) ?? { scoreSum: 0, count: 0, emojis: [] };
    map.set(dateKey, {
      scoreSum: prev.scoreSum + score,
      count: prev.count + 1,
      emojis: [...prev.emojis, ...(entry.emojis ?? [])],
    });
  });

  return map;
};

// Últimos 7 días (día a día)
const buildLast7DaysSeries = (entries) => {
  const today = startOfDay(new Date());
  const dailyStats = buildDailyStatsMap(entries);
  const result = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = formatDateKey(date);
    const stats = dailyStats.get(key);

    const hasData = !!stats && stats.count > 0;
    const avgScore = hasData ? stats.scoreSum / stats.count : 0;
    const score = hasData ? Math.round(avgScore) : 0;

    result.push({
      label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      fullLabel: date.toLocaleDateString(),
      score,
      hasData,
      scoreLabel: hasData ? scoreToLabel(score) : 'Sin registro',
      emojis: stats?.emojis ?? [],
    });
  }

  return result;
};

// Últimas 8 semanas (0 = esta semana, 7 = hace 7 semanas)
const buildLast8WeeksSeries = (entries) => {
  const today = startOfDay(new Date());
  const weekBuckets = Array.from({ length: 8 }, () => ({
    scoreSum: 0,
    count: 0,
  }));

  entries.forEach((entry) => {
    const day = startOfDay(entry.date);
    const diffMs = today.getTime() - day.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return;
    if (diffDays >= 56) return; // más de 8 semanas

    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex < 0 || weekIndex > 7) return;

    const score = computeMoodScore(entry);
    weekBuckets[weekIndex].scoreSum += score;
    weekBuckets[weekIndex].count += 1;
  });

  const labels = [
    'Hoy',
    'Hace 1 día',
    'Hace 2 días',
    'Hace 3 días',
    'Hace 4 días',
    'Hace 5 días',
    'Hace 6 días',
    'Hace 7 días',
  ];

  // De más antigua a más reciente (reverse)
  return weekBuckets
    .map((bucket, index) => {
      if (!bucket.count) {
        return {
          label: labels[index],
          score: 0,
          hasData: false,
          scoreLabel: 'Sin registro',
        };
      }
      const avg = bucket.scoreSum / bucket.count;
      const score = round(avg, 1);
      return {
        label: labels[index],
        score,
        hasData: true,
        scoreLabel: scoreToLabel(score),
      };
    })
    .reverse();
};

// Emojis más usados
const buildEmotionFrequency = (entries) => {
  const counts = {};
  entries.forEach((entry) => {
    (entry.emojis ?? []).forEach((emoji) => {
      counts[emoji] = (counts[emoji] ?? 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, value]) => ({ emoji, value }));
};

// Score 0..100 -> altura %
const scoreToHeightPct = (score) => {
  const clamped = Math.max(0, Math.min(100, score));
  return `${clamped}%`;
};

// -------------------- UI helpers --------------------
const Bar = ({ label, score, scoreLabel, colors, highlighted, hasData }) => {
  const height = hasData ? scoreToHeightPct(score) : '0%';
  return (
    <View style={styles.barContainer}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              height,
              backgroundColor: hasData
                ? highlighted
                  ? colors.primary
                  : `${colors.primary}77`
                : colors.muted,
            },
          ]}
        />
      </View>
      <Text style={[styles.barValue, { color: colors.text }]}>{scoreLabel}</Text>
      <Text style={[styles.barLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
};

const EmotionRow = ({ emoji, value, colors }) => (
  <View style={[styles.emotionRow, { borderColor: colors.muted }]}>
    <Text style={[styles.emotionEmoji, { color: colors.text }]}>{emoji}</Text>
    <Text style={[styles.emotionValue, { color: colors.subText }]}>
      Registrada {value} veces
    </Text>
  </View>
);

// -------------------- Componente principal --------------------
const MoodInsightsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    safeTop,
    safeBottom,
  } = useResponsiveLayout({ maxContentWidth: 920, horizontalFactor: 0.06 });

  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  const user = auth.currentUser;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setEntries([]);
        setLoading(false);
        return;
      }

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - DAYS_TO_FETCH);
        const startTimestamp = Timestamp.fromDate(startDate);

        const moodsRef = collection(db, 'users', user.uid, 'moods');
        const moodsQuery = query(
          moodsRef,
          where('createdAt', '>=', startTimestamp),
          orderBy('createdAt', 'desc'),
          limit(400),
        );

        const snapshot = await getDocs(
          moodsQuery.withConverter({
            toFirestore: (value) => value,
            fromFirestore: (snap) => {
              const data = snap.data() ?? {};
              const createdAt = data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date();
              return {
                id: snap.id,
                emojis: Array.isArray(data.emojis) ? data.emojis : [],
                scores: data.scores ?? {},
                moodLabel: data.moodLabel ?? 'neutral',
                createdAt,
                date: createdAt,
              };
            },
          }),
        );

        const nextEntries = snapshot.docs.map((docSnap) => docSnap.data());
        setEntries(nextEntries);
        setLoading(false);
      } catch (err) {
        setError(err);
        setEntries([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const dailySeries = useMemo(
    () => buildLast7DaysSeries(entries),
    [entries],
  );
  const weeklySeries = useMemo(
    () => buildLast8WeeksSeries(entries),
    [entries],
  );
  const emotionFrequency = useMemo(
    () => buildEmotionFrequency(entries),
    [entries],
  );

  const averageScore = useMemo(() => {
    if (!entries.length) return null;
    const total = entries.reduce(
      (acc, entry) => acc + computeMoodScore(entry),
      0,
    );
    return round(total / entries.length, 1);
  }, [entries]);

  const averageScoreLabel =
    averageScore === null ? 'Sin registros aún' : scoreToLabel(averageScore);

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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: verticalPadding,
            paddingBottom: verticalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <View style={[styles.content, contentWidthStyle]}>
          <PageHeader
            title="Resumen de tu ánimo"
            subtitle="Te mostramos tus registros con palabras simples: Día difícil, Día normal o Buen día."
          />

          {/* ESTADO DE CARGA / ERROR */}
          {loading ? (
            <View
              style={[
                styles.loading,
                { backgroundColor: colors.surface, borderColor: colors.muted },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.subText }]}>
                Analizando tus registros recientes...
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.loading,
                { backgroundColor: colors.surface, borderColor: colors.danger },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.danger}
              />
              <Text style={[styles.loadingText, { color: colors.danger }]}>
                No pudimos cargar tus datos. Intenta de nuevo más tarde.
              </Text>
            </View>
          ) : (
            <>
              {/* RESUMEN SIMPLE */}
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.muted,
                  },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Resumen rápido
                </Text>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Cómo han sido tus días
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: colors.text },
                      ]}
                    >
                      {averageScoreLabel}
                    </Text>
                    <Text
                      style={[
                        styles.summaryHelp,
                        { color: colors.subText },
                      ]}
                    >
                      Tomamos todos tus registros recientes y los resumimos en
                      una frase.
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Registros analizados
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: colors.text },
                      ]}
                    >
                      {entries.length}
                    </Text>
                    <Text
                      style={[
                        styles.summaryHelp,
                        { color: colors.subText },
                      ]}
                    >
                      Mientras más registras, más clara se vuelve la foto de tu
                      ánimo.
                    </Text>
                  </View>
                </View>

                <Text style={[styles.summaryHint, { color: colors.subText }]}>
                  Si algún día no registras nada, lo verás como "Sin registro"
                  en los gráficos.
                </Text>
              </View>

              {/* ÚLTIMOS 7 DÍAS */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Cómo te has sentido esta semana
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.subText },
                  ]}
                >
                  Cada día se resume como: Día difícil, Día normal, Buen día o
                  Sin registro.
                </Text>

                <View
                  style={[
                    styles.chart,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.muted,
                    },
                  ]}
                >
                  {dailySeries.map((item) => (
                    <Bar
                      key={item.fullLabel}
                      label={item.label}
                      score={item.score}
                      scoreLabel={item.scoreLabel}
                      colors={colors}
                      highlighted={item.hasData && item.score >= 67}
                      hasData={item.hasData}
                    />
                  ))}
                </View>
              </View>

              {/* ÚLTIMOS 8 DÍAS */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Tendencia de los últimos días
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.subText },
                  ]}
                >
                  Si en un día no registraste emociones, se muestra como
                  "Sin registro".
                </Text>

                <View
                  style={[
                    styles.chartHorizontal,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.muted,
                    },
                  ]}
                >
                  {weeklySeries.map((item) => (
                    <View key={item.label} style={styles.weekRow}>
                      <View style={styles.weekInfo}>
                        <Text
                          style={[
                            styles.weekLabel,
                            { color: colors.text },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.weekValue,
                            { color: colors.subText },
                          ]}
                        >
                          {item.scoreLabel}
                        </Text>
                      </View>
                      <View style={styles.weekBarTrack}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              width: item.hasData
                                ? scoreToHeightPct(item.score)
                                : '0%',
                              backgroundColor: item.hasData
                                ? colors.primary
                                : colors.muted,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* EMOCIONES MÁS FRECUENTES */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Emociones que más se repiten
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.subText },
                  ]}
                >
                  Contamos cuántas veces elegiste cada emoción en los últimos{' '}
                  {DAYS_TO_FETCH} días.
                </Text>

                <View style={styles.emotionList}>
                  {emotionFrequency.length ? (
                    emotionFrequency.map((item) => (
                      <EmotionRow
                        key={item.emoji}
                        emoji={item.emoji}
                        value={item.value}
                        colors={colors}
                      />
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        { color: colors.subText },
                      ]}
                    >
                      Aún no hay suficientes datos. Registra cómo te sientes
                      para ver aquí tus emociones más frecuentes.
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MoodInsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    gap: 20,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 13,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryHelp: {
    fontSize: 11,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  chart: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  barTrack: {
    height: 140,
    width: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.18)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartHorizontal: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  weekRow: {
    gap: 6,
  },
  weekInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekValue: {
    fontSize: 13,
  },
  weekBarTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  weekBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  emotionList: {
    gap: 8,
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emotionEmoji: {
    fontSize: 18,
  },
  emotionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});

