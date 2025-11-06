import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  query,
  Timestamp,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../screens/firebase/config';
import {
  getWeekBoundaries,
  summarizeMoodEntries,
  summarizeHabitEntries,
  evaluateGoalProgress,
} from '../utils/progressMetrics';
import { sendLocalNotification } from '../hooks/useNotificationSetup';

const GoalContext = createContext(null);

const emptyArray = [];

const mapDoc = (docSnapshot) => {
  const data = docSnapshot.data() ?? {};
  return {
    id: docSnapshot.id,
    ...data,
  };
};

const findPreviousSnapshot = (snapshots, goalId, weekStartDate) => {
  return snapshots
    .filter((snapshot) => snapshot.goalId === goalId)
    .find((snapshot) => {
      if (!snapshot.weekStartDate) {
        return false;
      }
      return snapshot.weekStartDate < weekStartDate;
    });
};

const defaultMeasurementLabel = (category) => {
  switch (category) {
    case 'mood':
      return 'puntos';
    case 'habit':
      return 'registros';
    case 'custom':
    default:
      return 'acciones';
  }
};

export const GoalProvider = ({ children }) => {
  const [userUid, setUserUid] = useState(auth.currentUser?.uid ?? null);

  const [goals, setGoals] = useState(emptyArray);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [snapshots, setSnapshots] = useState(emptyArray);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);

  const [weeklyReports, setWeeklyReports] = useState(emptyArray);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [generatingReport, setGeneratingReport] = useState(false);
  const [lastGenerationError, setLastGenerationError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUserUid(firebaseUser?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userUid) {
      setGoals(emptyArray);
      setGoalsLoading(false);
      return undefined;
    }

    setGoalsLoading(true);
    const goalsRef = collection(db, 'users', userUid, 'goals');
    const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      goalsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnapshot) => {
          const data = mapDoc(docSnapshot);
          return {
            ...data,
            measurementLabel:
              typeof data.measurementLabel === 'string' && data.measurementLabel.trim()
                ? data.measurementLabel
                : defaultMeasurementLabel(data.category),
            createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            updatedAtDate: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
            archivedAtDate: data.archivedAt?.toDate ? data.archivedAt.toDate() : null,
          };
        });
        setGoals(mapped);
        setGoalsLoading(false);
      },
      () => {
        setGoals(emptyArray);
        setGoalsLoading(false);
      },
    );

    return unsubscribe;
  }, [userUid]);

  useEffect(() => {
    if (!userUid) {
      setSnapshots(emptyArray);
      setSnapshotsLoading(false);
      return undefined;
    }

    setSnapshotsLoading(true);
    const snapshotsRef = collection(db, 'users', userUid, 'goalSnapshots');
    const snapshotsQuery = query(snapshotsRef, orderBy('weekStart', 'desc'), limit(40));

    const unsubscribe = onSnapshot(
      snapshotsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnapshot) => {
          const data = mapDoc(docSnapshot);
          const weekStartDate = data.weekStart?.toDate ? data.weekStart.toDate() : null;
          const weekEndDate = data.weekEnd?.toDate ? data.weekEnd.toDate() : null;
          return {
            ...data,
            weekStartDate,
            weekEndDate,
            generatedAtDate: data.generatedAt?.toDate ? data.generatedAt.toDate() : null,
            measurementLabel:
              typeof data.measurementLabel === 'string' && data.measurementLabel.trim()
                ? data.measurementLabel
                : defaultMeasurementLabel(data.goalCategory),
          };
        });
        setSnapshots(mapped);
        setSnapshotsLoading(false);
      },
      () => {
        setSnapshots(emptyArray);
        setSnapshotsLoading(false);
      },
    );

    return unsubscribe;
  }, [userUid]);

  useEffect(() => {
    if (!userUid) {
      setWeeklyReports(emptyArray);
      setReportsLoading(false);
      return undefined;
    }

    setReportsLoading(true);
    const reportsRef = collection(db, 'users', userUid, 'weeklyReports');
    const reportsQuery = query(reportsRef, orderBy('weekStart', 'desc'), limit(12));

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnapshot) => {
          const data = mapDoc(docSnapshot);
          const weekStartDate = data.weekStart?.toDate ? data.weekStart.toDate() : null;
          const weekEndDate = data.weekEnd?.toDate ? data.weekEnd.toDate() : null;
          const goals = Array.isArray(data.goals)
            ? data.goals.map((goal) => ({
                ...goal,
                measurementLabel:
                  typeof goal.measurementLabel === 'string' && goal.measurementLabel.trim()
                    ? goal.measurementLabel
                    : defaultMeasurementLabel(goal.category),
              }))
            : [];
          return {
            ...data,
            goals,
            weekStartDate,
            weekEndDate,
            generatedAtDate: data.generatedAt?.toDate ? data.generatedAt.toDate() : null,
          };
        });
        setWeeklyReports(mapped);
        setReportsLoading(false);
      },
      () => {
        setWeeklyReports(emptyArray);
        setReportsLoading(false);
      },
    );

    return unsubscribe;
  }, [userUid]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.isActive !== false),
    [goals],
  );

  const createGoal = useCallback(async (payload) => {
    if (!userUid) {
      throw new Error('Sesion no disponible');
    }

    if (activeGoals.length >= 3 && payload?.isActive !== false) {
      throw new Error('Solo puedes tener hasta 3 metas activas.');
    }

    const goalsRef = collection(db, 'users', userUid, 'goals');
    const now = serverTimestamp();
    await addDoc(goalsRef, {
      title: payload.title ?? 'Meta sin titulo',
      category: payload.category ?? 'custom',
      metricType: payload.metricType ?? 'frequency',
      comparison: payload.comparison ?? 'atLeast',
      targetValue: Number(payload.targetValue ?? 0),
      filters: payload.filters ?? {},
      description: payload.description ?? '',
      measurementLabel:
        (payload.measurementLabel ?? '').trim() ||
        defaultMeasurementLabel(payload.category ?? 'custom'),
      createdAt: now,
      updatedAt: now,
      isActive: payload.isActive ?? true,
    });
  }, [userUid, activeGoals.length]);

  const updateGoal = useCallback(async (goalId, updates = {}) => {
    if (!userUid) {
      throw new Error('Sesion no disponible');
    }
    if (!goalId) {
      throw new Error('goalId requerido');
    }

    const goalRef = doc(db, 'users', userUid, 'goals', goalId);
    const nextIsActive = updates.isActive;
    if (nextIsActive === true) {
      const otherActive = activeGoals.filter((goal) => goal.id !== goalId);
      if (otherActive.length >= 3) {
        throw new Error('Solo puedes tener hasta 3 metas activas.');
      }
    }

    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (typeof updates.measurementLabel === 'string') {
      payload.measurementLabel =
        updates.measurementLabel.trim() || defaultMeasurementLabel(updates.category ?? 'custom');
    }

    if (updates.isActive === false) {
      payload.archivedAt = serverTimestamp();
    }

    await updateDoc(goalRef, payload);
  }, [userUid, activeGoals]);

  const archiveGoal = useCallback(
    async (goalId) => {
      await updateGoal(goalId, { isActive: false });
    },
    [updateGoal],
  );

  const logGoalActivity = useCallback(async ({ goalId, value = 1, note = '' }) => {
    if (!userUid) {
      throw new Error('Sesion no disponible');
    }
    if (!goalId) {
      throw new Error('goalId requerido');
    }

    const activitiesRef = collection(db, 'users', userUid, 'goalActivities');
    await addDoc(activitiesRef, {
      goalId,
      value: Number(value ?? 1),
      note,
      createdAt: serverTimestamp(),
    });
  }, [userUid]);

  const generateWeeklyReport = useCallback(
    async ({ referenceDate = new Date(), force = false } = {}) => {
      if (!userUid) {
        throw new Error('Sesion no disponible');
      }

    if (!activeGoals.length) {
      throw new Error('Necesitas al menos una meta activa para generar un reporte.');
    }

    setGeneratingReport(true);
    setLastGenerationError(null);

    try {
      const { weekStartDate, weekEndDate, weekKey } = getWeekBoundaries(referenceDate);
      const weekStartTimestamp = Timestamp.fromDate(weekStartDate);
      const weekEndTimestamp = Timestamp.fromDate(weekEndDate);

      if (!force) {
        const alreadyExists = weeklyReports.some((report) => report.weekKey === weekKey);
        if (alreadyExists) {
          setGeneratingReport(false);
          return { skipped: true, reason: 'exists' };
        }
      }

      const moodsRef = collection(db, 'users', userUid, 'moods');
      const moodsQuery = query(
        moodsRef,
        where('createdAt', '>=', weekStartTimestamp),
        where('createdAt', '<=', weekEndTimestamp),
      );
      const moodsSnapshot = await getDocs(moodsQuery);
      const moodEntries = moodsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() ?? {};
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        return {
          id: docSnapshot.id,
          emojis: Array.isArray(data.emojis) ? data.emojis : [],
          scores: data.scores ?? {},
          moodLabel: data.moodLabel,
          createdAt,
        };
      });

      const habitsRef = collection(db, 'users', userUid, 'habits');
      const habitsQuery = query(
        habitsRef,
        where('createdAt', '>=', weekStartTimestamp),
        where('createdAt', '<=', weekEndTimestamp),
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      const habitEntries = habitsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() ?? {};
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        return {
          id: docSnapshot.id,
          categories: Array.isArray(data.agentCategories) ? data.agentCategories : [],
          summary: data.agentSummary,
          createdAt,
        };
      });

      const activitiesRef = collection(db, 'users', userUid, 'goalActivities');
      const activitiesQuery = query(
        activitiesRef,
        where('createdAt', '>=', weekStartTimestamp),
        where('createdAt', '<=', weekEndTimestamp),
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activitiesByGoal = {};
      activitiesSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() ?? {};
        const goalId = data.goalId;
        if (!goalId) {
          return;
        }
        if (!activitiesByGoal[goalId]) {
          activitiesByGoal[goalId] = [];
        }
        activitiesByGoal[goalId].push({
          id: docSnapshot.id,
          value: Number(data.value ?? 1),
          note: data.note ?? '',
        });
      });

      const batch = writeBatch(db);

      const moodOverview = summarizeMoodEntries(moodEntries);
      const habitOverview = summarizeHabitEntries(habitEntries);

      const goalSummaries = [];

      activeGoals.forEach((goal) => {
        const previousSnapshot = findPreviousSnapshot(snapshots, goal.id, weekStartDate);
        const evaluation = evaluateGoalProgress({
          goal,
          moodEntries,
          habitEntries,
          activities: activitiesByGoal[goal.id] ?? [],
          previousSnapshot,
        });

        const snapshotId = `${goal.id}_${weekKey}`;
        const snapshotRef = doc(collection(db, 'users', userUid, 'goalSnapshots'), snapshotId);

        batch.set(snapshotRef, {
          goalId: goal.id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          metricType: goal.metricType,
          comparison: evaluation.comparison,
          targetValue: evaluation.targetValue,
          actualValue: evaluation.actualValue,
          delta: evaluation.delta,
          coverageCount: evaluation.coverageCount,
          met: evaluation.met,
          streakAfterWeek: evaluation.streakAfterWeek,
          progressPercent: evaluation.progressPercent,
          details: evaluation.details,
          weekKey,
          weekStart: weekStartTimestamp,
          weekEnd: weekEndTimestamp,
          generatedAt: serverTimestamp(),
          measurementLabel:
            goal.measurementLabel ??
            defaultMeasurementLabel(goal.category),
        });

        goalSummaries.push({
          goalId: goal.id,
          title: goal.title,
          category: goal.category,
          metricType: goal.metricType,
          met: evaluation.met,
          actualValue: evaluation.actualValue,
          targetValue: evaluation.targetValue,
          comparison: evaluation.comparison,
          delta: evaluation.delta,
          streakAfterWeek: evaluation.streakAfterWeek,
          measurementLabel:
            goal.measurementLabel ??
            defaultMeasurementLabel(goal.category),
          progressPercent: evaluation.progressPercent,
        });
      });

      const reportRef = doc(collection(db, 'users', userUid, 'weeklyReports'), weekKey);
      batch.set(reportRef, {
        weekKey,
        weekStart: weekStartTimestamp,
        weekEnd: weekEndTimestamp,
        generatedAt: serverTimestamp(),
        goals: goalSummaries,
        moodOverview,
        habitOverview,
      });

      await batch.commit();

      const metCount = goalSummaries.filter((summary) => summary.met).length;
      try {
        await sendLocalNotification({
          title: 'Reporte semanal listo',
          body: `Semana ${weekKey}: ${metCount} de ${goalSummaries.length} metas cumplidas.`,
          data: { type: 'weekly-report', weekKey },
        });
      } catch (notificationError) {
        // Ignoramos fallos de notificacion local.
      }

      setGeneratingReport(false);
      return { weekKey, goalSummaries, moodOverview, habitOverview };
    } catch (error) {
      setLastGenerationError(error);
      setGeneratingReport(false);
      throw error;
    }
  },
    [
      userUid,
      activeGoals,
      weeklyReports,
      snapshots,
    ],
  );

  const value = useMemo(
    () => ({
      goals,
      snapshots,
      weeklyReports,
      activeGoals,
      isLoading: goalsLoading || snapshotsLoading || reportsLoading,
      generatingReport,
      lastGenerationError,
      createGoal,
      updateGoal,
      archiveGoal,
      logGoalActivity,
      generateWeeklyReport,
      userUid,
    }),
    [
      goals,
      snapshots,
      weeklyReports,
      activeGoals,
      goalsLoading,
      snapshotsLoading,
      reportsLoading,
      generatingReport,
      lastGenerationError,
      createGoal,
      updateGoal,
      archiveGoal,
      logGoalActivity,
      generateWeeklyReport,
      userUid,
    ],
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoals debe usarse dentro de GoalProvider');
  }
  return context;
};
