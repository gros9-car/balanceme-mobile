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
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { useGoals } from '../context/GoalContext';

const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

/**
 * Pantalla que muestra el detalle de un reporte semanal concreto,
 * incluyendo metas, resultados y resúmenes de ánimo y hábitos.
 */
const ReportDetailScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { horizontalPadding, verticalPadding, maxContentWidth, safeTop, safeBottom } =
    useResponsiveLayout({ maxContentWidth: 780, horizontalFactor: 0.06 });
  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );
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
  const dateRangeLabel =
    report?.weekStartDate && report?.weekEndDate
      ? `${formatDate(report.weekStartDate)} - ${formatDate(report.weekEndDate)}`
      : null;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: safeBottom },
      ]}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
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
            title={`Reporte semana ${report?.weekKey ?? '--'}`}
            subtitle={dateRangeLabel}
          />

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportDetailScreen;

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
