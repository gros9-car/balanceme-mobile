import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
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

const DAYS_TO_FETCH = 60;
const EMOTIONS_PER_ENTRY_TARGET = 3;

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isoWeekKey = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
  return `${tempDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const generateRange = (length, endDate = new Date()) => {
  const result = [];
  const cursor = new Date(endDate);
  cursor.setHours(0, 0, 0, 0);
  for (let i = length - 1; i >= 0; i -= 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - i);
    result.push(new Date(date));
  }
  return result;
};

const groupByDay = (entries) => {
  const map = new Map();
  entries.forEach((entry) => {
    const key = formatDateKey(entry.date);
    const prev = map.get(key) ?? { totalValence: 0, totalEnergy: 0, count: 0, emojis: [] };
    map.set(key, {
      totalValence: prev.totalValence + (entry.scores?.valence ?? 0),
      totalEnergy: prev.totalEnergy + (entry.scores?.energy ?? 0),
      count: prev.count + 1,
      emojis: [...prev.emojis, ...(entry.emojis ?? [])],
    });
  });
  return map;
};

const aggregateDailySeries = (entries) => {
  const grouped = groupByDay(entries);
  const today = new Date();
  const days = generateRange(7, today);
  return days.map((date) => {
    const key = formatDateKey(date);
    const record = grouped.get(key);
    const value = record ? record.totalValence / record.count : 0;
    return {
      label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      fullLabel: date.toLocaleDateString(),
      value: round(value, 2),
      emojis: record?.emojis ?? [],
    };
  });
};

const aggregateWeeklySeries = (entries) => {
  const byWeek = new Map();
  entries.forEach((entry) => {
    const key = isoWeekKey(entry.date);
    const prev = byWeek.get(key) ?? { totalValence: 0, count: 0, emojis: [] };
    byWeek.set(key, {
      totalValence: prev.totalValence + (entry.scores?.valence ?? 0),
      count: prev.count + 1,
      emojis: [...prev.emojis, ...(entry.emojis ?? [])],
    });
  });

  const weeks = [];
  const reference = new Date();
  reference.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i += 1) {
    const date = new Date(reference);
    date.setDate(reference.getDate() - i * 7);
    weeks.push({ date, key: isoWeekKey(date) });
  }

  return weeks.reverse().map((item) => {
    const record = byWeek.get(item.key);
    const value = record ? record.totalValence / record.count : 0;
    const weekRange = `${item.key}`;
    return {
      label: weekRange,
      value: round(value, 2),
      emojis: record?.emojis ?? [],
    };
  });
};

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

const valueToHeight = (value) => {
  const min = -2;
  const max = 2;
  const normalized = (value - min) / (max - min);
  return `${Math.round(normalized * 100)}%`;
};

const Bar = ({ label, value, colors, highlighted }) => {
  const height = valueToHeight(value);
  return (
    <View style={styles.barContainer}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              height,
              backgroundColor: highlighted ? colors.primary : colors.primary + '77',
            },
          ]}
        />
      </View>
      <Text style={[styles.barValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      <Text style={[styles.barLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
};

const EmotionRow = ({ emoji, value, colors }) => (
  <View style={[styles.emotionRow, { borderColor: colors.muted }]}>
    <Text style={[styles.emotionEmoji, { color: colors.text }]}>{emoji}</Text>
    <Text style={[styles.emotionValue, { color: colors.subText }]}>
      {value} apariciones
    </Text>
  </View>
);

const MoodInsightsScreen = ({ navigation }) => {
  const { colors } = useTheme();
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

        const snapshot = await getDocs(moodsQuery.withConverter({
          toFirestore: (value) => value,
          fromFirestore: (snap) => {
            const data = snap.data() ?? {};
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            return {
              id: snap.id,
              emojis: Array.isArray(data.emojis) ? data.emojis : [],
              scores: data.scores ?? {},
              moodLabel: data.moodLabel ?? 'neutral',
              createdAt,
              date: createdAt,
            };
          },
        }));

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

  const weeklySeries = useMemo(() => aggregateDailySeries(entries), [entries]);
  const monthlySeries = useMemo(() => aggregateWeeklySeries(entries), [entries]);
  const emotionFrequency = useMemo(() => buildEmotionFrequency(entries), [entries]);

  const averageValence = useMemo(() => {
    if (!entries.length) {
      return 0;
    }
    const total = entries.reduce((acc, entry) => acc + (entry.scores?.valence ?? 0), 0);
    return round(total / entries.length, 2);
  }, [entries]);

  const averagePerEntry = useMemo(() => {
    if (!entries.length) {
      return 0;
    }
    const totalEmotions = entries.reduce((acc, entry) => acc + (entry.emojis?.length ?? 0), 0);
    return round(totalEmotions / entries.length, 2);
  }, [entries]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Patrones emocionales</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>
              Registra hasta {EMOTIONS_PER_ENTRY_TARGET} emociones diarias y observa tus tendencias.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>
              Analizando tus registros recientes...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.loading}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={[styles.loadingText, { color: colors.danger }]}>
              No pudimos cargar tus datos. Intenta de nuevo más tarde.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.subText }]}>Promedio valencia</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{averageValence}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.subText }]}>Emociones por registro</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {averagePerEntry} / {EMOTIONS_PER_ENTRY_TARGET}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.subText }]}>Registros</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{entries.length}</Text>
                </View>
              </View>
              <Text style={[styles.summaryHint, { color: colors.subText }]}>
                Busca registrar emociones variadas cada día para obtener recomendaciones más precisas.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimos 7 días</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
                Promedio de valencia emocional por jornada (de -2 a 2).
              </Text>
              <View style={[styles.chart, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
                {weeklySeries.map((item) => (
                  <Bar
                    key={item.fullLabel}
                    label={item.label}
                    value={item.value}
                    colors={colors}
                    highlighted={item.value >= 0}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimas 8 semanas</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
                Tendencia semanal basada en tus registros de ánimo.
              </Text>
              <View style={[styles.chartHorizontal, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
                {monthlySeries.map((item) => (
                  <View key={item.label} style={styles.weekRow}>
                    <View style={styles.weekInfo}>
                      <Text style={[styles.weekLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.weekValue, { color: colors.subText }]}>{item.value.toFixed(2)}</Text>
                    </View>
                    <View style={styles.weekBarTrack}>
                      <View
                        style={[
                          styles.weekBarFill,
                          { width: `${(item.value + 2) * 25}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Emociones más frecuentes</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
                Basado en tus últimos {DAYS_TO_FETCH} días de seguimiento.
              </Text>
              <View style={styles.emotionList}>
                {emotionFrequency.length ? (
                  emotionFrequency.map((item) => (
                    <EmotionRow key={item.emoji} emoji={item.emoji} value={item.value} colors={colors} />
                  ))
                ) : (
                  <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
                    Aún no hay suficientes datos para mostrar tendencias.
                  </Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MoodInsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 13,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
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
    backgroundColor: 'rgba(99,102,241,0.08)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: 'rgba(99,102,241,0.1)',
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
