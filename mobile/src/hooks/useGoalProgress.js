// Sistema de metas anterior desactivado.
// Este hook queda como stub para evitar romper imports existentes.
export const useGoalProgress = () => {
  return {
    goals: [],
    activeGoals: [],
    latestReport: null,
    snapshots: [],
    latestSnapshots: {},
    currentWeekSnapshots: [],
    weeklyReports: [],
    generateWeeklyReport: async () => ({
      skipped: true,
      reason: 'legacy-goals-disabled',
    }),
    logGoalActivity: async () => {},
    createGoal: async () => {},
    updateGoal: async () => {},
    archiveGoal: async () => {},
    isLoading: false,
    generatingReport: false,
    currentWeekKey: null,
  };
};
