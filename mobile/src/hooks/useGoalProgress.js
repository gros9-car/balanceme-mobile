/**
 * Hook legado de progreso de metas.
 *
 * El sistema de metas anterior está desactivado, así que este hook actúa
 * como un "stub": mantiene la misma API pero devuelve estructuras vacías
 * y funciones no operativas para no romper imports existentes.
 *
 * @returns {{
 *   goals: any[],
 *   activeGoals: any[],
 *   latestReport: any,
 *   snapshots: any[],
 *   latestSnapshots: Object,
 *   currentWeekSnapshots: any[],
 *   weeklyReports: any[],
 *   generateWeeklyReport: Function,
 *   logGoalActivity: Function,
 *   createGoal: Function,
 *   updateGoal: Function,
 *   archiveGoal: Function,
 *   isLoading: boolean,
 *   generatingReport: boolean,
 *   currentWeekKey: string | null
 * }}
 */
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
