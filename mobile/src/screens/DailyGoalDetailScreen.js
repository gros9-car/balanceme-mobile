import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { useAppAlert } from '../context/AppAlertContext';
import {
  getWeeklyCompletion,
  subscribeGoalCheckins,
} from '../services/dailyGoals';

/**
 * Pantalla de detalle para una meta diaria concreta.
 * Muestra la información semanal de cumplimiento y el historial
 * de check-ins diarios usando datos de Firestore.
 */
const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWeekStart = (value) => {
  const date = startOfDay(value);
  const day = date.getDay(); // 0 = domingo, 1 = lunes...
  const diff = (day + 6) % 7; // lunes -> 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateKey = (value) => {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Pantalla de detalle para una meta diaria concreta.
 * Muestra información semanal de cumplimiento y el historial
 * de check-ins diarios usando datos de Firestore.
 */
const DailyGoalDetailScreen = ({ route }) => {
  const { goalId, goalTitle: initialTitle } = route.params ?? {};
  const { colors } = useTheme();
  const { showAlert } = useAppAlert();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    safeTop,
    safeBottom,
  } = useResponsiveLayout({ maxContentWidth: 720 });

  const user = auth.currentUser;

  const [goal, setGoal] = useState(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [checkins, setCheckins] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !goalId) {
      setGoal(null);
      setGoalLoading(false);
      return undefined;
    }

    const goalRef = doc(db, 'users', user.uid, 'dailyGoals', goalId);
    const unsubscribe = onSnapshot(
      goalRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setGoal(null);
        } else {
          const data = snapshot.data() ?? {};
          const createdAtDate =
            data.createdAt?.toDate && typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate()
              : null;
          const weekStartDate =
            data.weekStart?.toDate && typeof data.weekStart.toDate === 'function'
              ? data.weekStart.toDate()
              : null;
          const lastCompletedDate =
            data.lastCompletedDate?.toDate &&
            typeof data.lastCompletedDate.toDate === 'function'
              ? data.lastCompletedDate.toDate()
              : null;

          setGoal({
            id: snapshot.id,
            title: data.title ?? initialTitle ?? 'Meta diaria',
            category: data.category ?? 'custom',
            isActive: data.isActive !== false,
            currentStreakWeeks: Number(data.currentStreakWeeks ?? 0) || 0,
            bestStreakWeeks: Number(data.bestStreakWeeks ?? 0) || 0,
            createdAtDate,
            weekStartDate,
            lastCompletedAtDate: lastCompletedDate,
          });
        }
        setGoalLoading(false);
      },
      () => {
        setGoal(null);
        setGoalLoading(false);
        showAlert({
          title: 'Error',
          message:
            'No pudimos cargar la informacion de esta meta. Intentalo nuevamente mas tarde.',
        });
      },
    );

    return unsubscribe;
  }, [user?.uid, goalId, initialTitle, showAlert]);

  useEffect(() => {
    if (!user?.uid || !goalId) {
      setCheckins([]);
      setCheckinsLoading(false);
      return undefined;
    }

    setCheckinsLoading(true);
    const unsubscribe = subscribeGoalCheckins(
      user.uid,
      goalId,
      { maxDays: 140 },
      (next) => {
        setCheckins(next);
        setCheckinsLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid, goalId]);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    [weekStart],
  );

  const weeklySummary = useMemo(
    () => getWeeklyCompletion(checkins, weekStart),
    [checkins, weekStart],
  );

  const doneKeys = useMemo(() => {
    const keys = new Set();
    (checkins || []).forEach((checkin) => {
      if (!checkin || !checkin.done) {
        return;
      }
      if (checkin.dateKey) {
        keys.add(checkin.dateKey);
      } else if (checkin.date instanceof Date) {
        keys.add(formatDateKey(checkin.date));
      }
    });
    return keys;
  }, [checkins]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart.getTime());
      date.setDate(weekStart.getDate() + i);
      const key = formatDateKey(date);
      days.push({
        key,
        date,
        label: weekdayLabels[i],
        done: doneKeys.has(key),
        isToday: formatDateKey(new Date()) === key,
      });
    }
    return days;
  }, [weekStart, doneKeys]);

  if (!user?.uid) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.background}
        />
        <View style={styles.centered}>
          <Ionicons
            name="lock-closed-outline"
            size={28}
            color={colors.subText}
          />
          <Text
            style={[
              styles.centeredText,
              { color: colors.subText },
            ]}
          >
            Inicia sesion para ver los detalles de tus metas diarias.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const loading = goalLoading || checkinsLoading;

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
            paddingTop: Math.max(verticalPadding * 0.5, 8),
            paddingBottom: Math.max(verticalPadding, 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <View
          style={[
            styles.content,
            {
              width: '100%',
              maxWidth: maxContentWidth,
              alignSelf: 'center',
            },
          ]}
        >
          <PageHeader
            title={goal?.title ?? initialTitle ?? 'Meta diaria'}
            subtitle="Revisa el detalle de tus check-ins semanales y tu racha."
          />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
              <Text
                style={[
                  styles.centeredText,
                  { color: colors.subText },
                ]}
              >
                Cargando detalles...
              </Text>
            </View>
          ) : !goal ? (
            <View style={styles.centered}>
              <Ionicons
                name="alert-circle-outline"
                size={24}
                color={colors.subText}
              />
              <Text
                style={[
                  styles.centeredText,
                  { color: colors.subText },
                ]}
              >
                No encontramos informacion para esta meta.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.muted,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.text },
                    ]}
                  >
                    Semana actual
                  </Text>
                </View>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: colors.subText },
                  ]}
                >
                  {formatDate(weekStart)} - {formatDate(weekEnd)} (lunes a domingo)
                </Text>

                <View style={styles.weekRow}>
                  {weekDays.map((day) => (
                    <View
                      key={day.key}
                      style={styles.weekDayBlock}
                    >
                      <Text
                        style={[
                          styles.weekDayLabel,
                          { color: colors.subText },
                        ]}
                      >
                        {day.label}
                      </Text>
                      <View
                        style={[
                          styles.weekDayCircle,
                          {
                            backgroundColor: day.done
                              ? colors.primary
                              : 'transparent',
                            borderColor: day.done
                              ? colors.primary
                              : colors.muted,
                          },
                        ]}
                      >
                        {day.isToday ? (
                          <View
                            style={[
                              styles.todayDot,
                              {
                                backgroundColor: day.done
                                  ? colors.primaryContrast
                                  : colors.primary,
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.weekSummaryRow}>
                  <View style={styles.weekSummaryItem}>
                    <Text
                      style={[
                        styles.weekSummaryLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Dǭas completados
                    </Text>
                    <Text
                      style={[
                        styles.weekSummaryValue,
                        { color: colors.text },
                      ]}
                    >
                      {weeklySummary.completedDays}/
                      {weeklySummary.totalDays}
                    </Text>
                  </View>
                  <View style={styles.weekSummaryItem}>
                    <Text
                      style={[
                        styles.weekSummaryLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Porcentaje
                    </Text>
                    <Text
                      style={[
                        styles.weekSummaryValue,
                        { color: colors.text },
                      ]}
                    >
                      {weeklySummary.completionPercent}%
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.muted,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Ionicons
                    name="flame-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.text },
                    ]}
                  >
                    Racha de semanas
                  </Text>
                </View>

                <View style={styles.streakRow}>
                  <View style={styles.streakItem}>
                    <Text
                      style={[
                        styles.streakLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Racha actual
                    </Text>
                    <Text
                      style={[
                        styles.streakValue,
                        { color: colors.text },
                      ]}
                    >
                      {goal.currentStreakWeeks ?? 0} semana
                      {goal.currentStreakWeeks === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.streakItem}>
                    <Text
                      style={[
                        styles.streakLabel,
                        { color: colors.subText },
                      ]}
                    >
                      Mejor racha
                    </Text>
                    <Text
                      style={[
                        styles.streakValue,
                        { color: colors.text },
                      ]}
                    >
                      {goal.bestStreakWeeks ?? 0} semana
                      {goal.bestStreakWeeks === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                {goal.lastCompletedAtDate ? (
                  <Text
                    style={[
                      styles.lastCompletedText,
                      { color: colors.subText },
                    ]}
                  >
                    ǧltima vez completada: {formatDate(goal.lastCompletedAtDate)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.lastCompletedText,
                      { color: colors.subText },
                    ]}
                  >
                    Aun no has completado esta meta en una semana.
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyGoalDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 24,
  },
  content: {
    gap: 20,
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekDayBlock: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weekSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekSummaryItem: {
    gap: 2,
  },
  weekSummaryLabel: {
    fontSize: 12,
  },
  weekSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  streakItem: {
    gap: 2,
  },
  streakLabel: {
    fontSize: 12,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastCompletedText: {
    fontSize: 12,
    marginTop: 10,
  },
});
