import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatValue = (value, metricType) => {
  if (metricType === 'avgMood') {
    return `${value?.toFixed?.(2) ?? Number(value ?? 0).toFixed(2)}`;
  }
  return String(value ?? 0);
};

const getStatusColor = (met, colors) => {
  if (met === true) {
    return colors.success;
  }
  if (met === false) {
    return colors.danger;
  }
  return colors.subText;
};

export const GoalProgressCard = ({
  goal,
  snapshot,
  onEdit,
  onArchive,
  onLogActivity,
  colors = defaultColors,
}) => {
  const statusColor = getStatusColor(snapshot?.met, colors);
  const statusLabel =
    snapshot?.met === true
      ? 'Meta cumplida'
      : snapshot?.met === false
        ? 'Meta pendiente'
        : 'Sin datos';

  const streakLabel = useMemo(() => {
    if (!snapshot) {
      return '0 semanas';
    }
    const streak = Number(snapshot.streakAfterWeek ?? 0);
    if (streak <= 0) {
      return 'Sin racha';
    }
    if (streak === 1) {
      return '1 semana';
    }
    return `${streak} semanas`;
  }, [snapshot]);

  const measurementLabel =
    goal.measurementLabel ||
    snapshot?.measurementLabel ||
    (goal.category === 'mood' ? 'puntos' : goal.category === 'habit' ? 'registros' : 'acciones');

  const targetDisplay = `${formatValue(goal.targetValue, goal.metricType)} ${measurementLabel}`;
  const actualDisplay = snapshot
    ? `${formatValue(snapshot.actualValue, goal.metricType)} ${measurementLabel}`
    : `0 ${measurementLabel}`;

  const remainingLabel = (() => {
    if (goal.comparison === 'atMost') {
      return `Mantente ≤ ${formatValue(goal.targetValue, goal.metricType)} ${measurementLabel}`;
    }
    const remaining = snapshot
      ? Math.max(0, goal.targetValue - snapshot.actualValue)
      : goal.targetValue;
    return `${formatValue(remaining, goal.metricType)} ${measurementLabel} restantes`;
  })();

  const progressPercent = snapshot?.progressPercent ?? (snapshot?.met ? 100 : 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{goal.title}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onEdit?.(goal)}
          >
            <Ionicons name="create-outline" size={18} color={colors.subText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onArchive?.(goal)}
          >
            <Ionicons name="archive-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.subText }]}>Actual</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{actualDisplay}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.subText }]}>Objetivo</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{targetDisplay}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.subText }]}>Racha</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{streakLabel}</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.subText }]}>
        {goal.description ?? 'Sin descripcion'}
      </Text>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: colors.primary, width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.subText }]}>
          {Math.min(100, Math.max(0, progressPercent)).toFixed(0)}% completado · {remainingLabel}
        </Text>
      </View>

      {goal.category === 'custom' ? (
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.primary }]}
          onPress={() => onLogActivity?.(goal)}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primaryContrast} />
          <Text style={[styles.logButtonText, { color: colors.primaryContrast }]}>
            Registrar avance
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    gap: 4,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metric: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarContainer: {
    gap: 6,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  logButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const defaultColors = {
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  subText: '#4b5563',
  primary: '#8b5cf6',
  primaryContrast: '#ffffff',
  danger: '#ef4444',
  success: '#16a34a',
};
