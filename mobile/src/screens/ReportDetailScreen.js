import React, { useMemo } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useGoals } from '../context/GoalContext';

const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

const ReportDetailScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { weeklyReports } = useGoals();
  const routeReport = route.params?.report ?? null;
  const reportId = route.params?.reportId ?? routeReport?.id ?? routeReport?.weekKey ?? null;

  const report = useMemo(() => {
    if (routeReport) {
      return routeReport;
    }
    if (!reportId) {
      return null;
    }
    return weeklyReports.find((item) => item.id === reportId || item.weekKey === reportId) ?? null;
  }, [routeReport, reportId, weeklyReports]);

  const goals = report?.goals ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backLabel, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              Reporte semana {report?.weekKey ?? '--'}
            </Text>
            {report?.weekStartDate ? (
              <Text style={[styles.subtitle, { color: colors.subText }]}>
                {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
              </Text>
            ) : null}
          </View>
        </View>

        {report ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen general</Text>
            <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
              <View style={styles.summaryMetric}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Metas cumplidas</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {goals.filter((item) => item.met).length} / {goals.length}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Animo promedio</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {report.moodOverview?.averageValence?.toFixed?.(2) ?? '0.00'}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Habitos</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {report.habitOverview?.count ?? 0}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            No encontramos el reporte solicitado.
          </Text>
        )}

        {goals.length ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalle por meta</Text>
            {goals.map((goal) => (
              <View
                key={goal.goalId}
                style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
              >
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                  <Text
                    style={[
                      styles.goalStatus,
                      { color: goal.met ? '#16a34a' : colors.danger ?? '#ef4444' },
                    ]}
                  >
                    {goal.met ? 'Cumplida' : 'Pendiente'}
                  </Text>
                </View>
                <View style={styles.goalMetrics}>
                  <Text style={[styles.goalMetric, { color: colors.subText }]}>
                    Actual: <Text style={{ color: colors.text }}>{goal.actualValue}</Text>
                  </Text>
                  <Text style={[styles.goalMetric, { color: colors.subText }]}>
                    Objetivo: <Text style={{ color: colors.text }}>{goal.targetValue}</Text>
                  </Text>
                  <Text style={[styles.goalMetric, { color: colors.subText }]}>
                    Racha: <Text style={{ color: colors.text }}>{goal.streakAfterWeek ?? 0}</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  summaryMetric: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalMetrics: {
    gap: 4,
  },
  goalMetric: {
    fontSize: 13,
  },
});
