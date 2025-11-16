import { HABIT_TAG_LABEL_LOOKUP, normalizeHabitTag } from '../constants/habitTags';

const roundTo = (value, decimals = 2) => {
  if (Number.isNaN(value)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const isoWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
};

export const startOfWeek = (date) => {
  const base = new Date(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base;
};

export const getWeekBoundaries = (reference = new Date()) => {
  const weekStartDate = startOfWeek(reference);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const weekNumber = isoWeekNumber(weekStartDate);
  const weekKey = `${weekStartDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

  return { weekStartDate, weekEndDate, weekKey };
};

export const summarizeMoodEntries = (entries = [], filters = {}) => {
  const { emojis } = filters;
  const filtered = Array.isArray(emojis) && emojis.length
    ? entries.filter((entry) => (entry.emojis ?? []).some((emoji) => emojis.includes(emoji)))
    : entries;

  if (!filtered.length) {
    return {
      count: 0,
      averageValence: 0,
      averageEnergy: 0,
    };
  }

  const totals = filtered.reduce(
    (acc, entry) => {
      const valence = Number(entry.scores?.valence ?? 0);
      const energy = Number(entry.scores?.energy ?? 0);
      acc.valence += valence;
      acc.energy += energy;
      return acc;
    },
    { valence: 0, energy: 0 },
  );

  return {
    count: filtered.length,
    averageValence: roundTo(totals.valence / filtered.length),
    averageEnergy: roundTo(totals.energy / filtered.length),
  };
};

const buildEntryHabitTags = (entry) => {
  const tagSet = new Set();
  (entry.presetHabits ?? []).forEach((tag) => {
    const normalized = normalizeHabitTag(tag);
    if (normalized) {
      tagSet.add(normalized);
    }
  });
  (entry.categories ?? []).forEach((legacy) => {
    const normalized = normalizeHabitTag(legacy);
    if (normalized) {
      tagSet.add(normalized);
    }
  });
  return Array.from(tagSet);
};

export const summarizeHabitEntries = (entries = [], filters = {}) => {
  const categoryFilter = Array.isArray(filters?.categories)
    ? filters.categories
        .map((category) => normalizeHabitTag(category))
        .filter(Boolean)
    : [];
  const filterSet = categoryFilter.length ? new Set(categoryFilter) : null;

  const resolvedEntries = entries.map((entry) => ({
    tags: buildEntryHabitTags(entry),
    entry,
  }));

  const filtered = filterSet
    ? resolvedEntries.filter(({ tags }) => tags.some((tag) => filterSet.has(tag)))
    : resolvedEntries;

  const categoryCounts = {};
  filtered.forEach(({ tags }) => {
    tags.forEach((category) => {
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    });
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      label: HABIT_TAG_LABEL_LOOKUP[category] ?? category,
    }));

  return {
    count: filtered.length,
    categoryCounts: sortedCategories,
  };
};

const evaluateComparison = (actual, target, comparison) => {
  if (comparison === 'atMost') {
    return actual <= target;
  }
  return actual >= target;
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const evaluateGoalProgress = ({
  goal,
  moodEntries = [],
  habitEntries = [],
  activities = [],
  previousSnapshot,
}) => {
  const { category, metricType, comparison = 'atLeast', targetValue = 0, filters = {} } = goal;

  let actualValue = 0;
  let coverageCount = 0;
  let details = {};

  if (category === 'mood') {
    if (metricType === 'avgMood') {
      const summary = summarizeMoodEntries(moodEntries, filters);
      actualValue = summary.averageValence;
      coverageCount = summary.count;
      details = summary;
    } else {
      const summary = summarizeMoodEntries(moodEntries, filters);
      actualValue = summary.count;
      coverageCount = summary.count;
      details = summary;
    }
  } else if (category === 'habit') {
    const summary = summarizeHabitEntries(habitEntries, filters);
    actualValue = summary.count;
    coverageCount = summary.count;
    details = summary;
  } else if (category === 'custom') {
    if (activities.length) {
      const total = activities.reduce((acc, item) => acc + Number(item.value ?? 1), 0);
      actualValue = roundTo(total, 2);
      coverageCount = activities.length;
      details = { total, coverageCount };
    } else {
      details = { total: 0, coverageCount: 0 };
    }
  }

  const met = evaluateComparison(actualValue, Number(targetValue ?? 0), comparison);
  const previousStreak = Number(previousSnapshot?.streakAfterWeek ?? 0);
  const streakAfterWeek = met ? previousStreak + 1 : 0;

  const progressPercent = (() => {
    const target = Number(targetValue ?? 0);
    if (target <= 0) {
      return met ? 100 : 0;
    }
    if (comparison === 'atLeast') {
      return clamp((actualValue / target) * 100);
    }
    // atMost
    if (actualValue <= target) {
      return clamp(((target - actualValue) / target) * 100, 0, 100);
    }
    return 0;
  })();

  return {
    actualValue: roundTo(actualValue),
    coverageCount,
    met,
    comparison,
    targetValue: Number(targetValue ?? 0),
    delta: roundTo(actualValue - Number(targetValue ?? 0)),
    streakAfterWeek,
    progressPercent: roundTo(progressPercent, 1),
    details,
  };
};
