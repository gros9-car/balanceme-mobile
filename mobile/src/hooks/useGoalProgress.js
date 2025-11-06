import { useMemo } from 'react';

import { useGoals } from '../context/GoalContext';
import { getWeekBoundaries } from '../utils/progressMetrics';

export const useGoalProgress = () => {
  const {
    goals,
    activeGoals,
    snapshots,
    weeklyReports,
    generateWeeklyReport,
    logGoalActivity,
    isLoading,
    generatingReport,
    createGoal,
    updateGoal,
    archiveGoal,
  } = useGoals();

  const { weekKey: currentWeekKey } = useMemo(() => getWeekBoundaries(new Date()), []);

  const latestReport = useMemo(
    () => weeklyReports[0] ?? null,
    [weeklyReports],
  );

  const snapshotsByGoal = useMemo(() => {
    return snapshots.reduce((acc, snapshot) => {
      if (!acc[snapshot.goalId]) {
        acc[snapshot.goalId] = [];
      }
      acc[snapshot.goalId].push(snapshot);
      return acc;
    }, {});
  }, [snapshots]);

  const latestSnapshots = useMemo(() => {
    const result = {};
    Object.entries(snapshotsByGoal).forEach(([goalId, goalSnapshots]) => {
      result[goalId] = goalSnapshots[0];
    });
    return result;
  }, [snapshotsByGoal]);

  const currentWeekSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.weekKey === currentWeekKey),
    [snapshots, currentWeekKey],
  );

  return {
    goals,
    activeGoals,
    latestReport,
    snapshots,
    latestSnapshots,
    currentWeekSnapshots,
    weeklyReports,
    generateWeeklyReport,
    logGoalActivity,
    createGoal,
    updateGoal,
    archiveGoal,
    isLoading,
    generatingReport,
    currentWeekKey,
  };
};
