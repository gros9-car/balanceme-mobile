import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { auth } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { useAppAlert } from '../context/AppAlertContext';
import {
  createDailyGoal,
  deactivateDailyGoal,
  deleteDailyGoal,
  getWeeklyCompletion,
  isGoalDoneToday,
  subscribeDailyGoals,
  subscribeGoalCheckins,
  toggleGoalToday,
  updateDailyGoal,
} from '../services/dailyGoals';

const DailyGoalsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showAlert } = useAppAlert();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    safeTop,
    safeBottom,
  } = useResponsiveLayout({ maxContentWidth: 960 });

  const user = auth.currentUser;

  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [checkinsByGoal, setCheckinsByGoal] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [togglingGoalId, setTogglingGoalId] = useState(null);

  const checkinsSubscriptionsRef = useRef({});

  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  const cleanupAllCheckinsSubscriptions = () => {
    const current = checkinsSubscriptionsRef.current || {};
    Object.values(current).forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    checkinsSubscriptionsRef.current = {};
  };

  useEffect(
    () => () => {
      cleanupAllCheckinsSubscriptions();
    },
    [],
  );

  useEffect(() => {
    if (!user?.uid) {
      setGoals([]);
      setGoalsLoading(false);
      cleanupAllCheckinsSubscriptions();
      setCheckinsByGoal({});
      return undefined;
    }

    setGoalsLoading(true);
    const unsubscribe = subscribeDailyGoals(user.uid, (nextGoals) => {
      setGoals(nextGoals);
      setGoalsLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const activeGoals = goals.filter((goal) => goal.isActive !== false);
    const activeGoalIds = activeGoals.map((goal) => goal.id);
    const currentSubs = checkinsSubscriptionsRef.current || {};

    // Cancelamos suscripciones que ya no son necesarias.
    Object.keys(currentSubs).forEach((goalId) => {
      if (!activeGoalIds.includes(goalId)) {
        if (typeof currentSubs[goalId] === 'function') {
          currentSubs[goalId]();
        }
        delete currentSubs[goalId];
        setCheckinsByGoal((prev) => {
          const next = { ...prev };
          delete next[goalId];
          return next;
        });
      }
    });

    // Creamos suscripciones para metas nuevas.
    activeGoalIds.forEach((goalId) => {
      if (!currentSubs[goalId]) {
        const unsubscribe = subscribeGoalCheckins(
          user.uid,
          goalId,
          { maxDays: 140 },
          (checkins) => {
            setCheckinsByGoal((prev) => ({
              ...prev,
              [goalId]: checkins,
            }));
          },
        );
        currentSubs[goalId] = unsubscribe;
      }
    });

    checkinsSubscriptionsRef.current = currentSubs;
  }, [user?.uid, goals]);

  const handleOpenCreateForm = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormCategory('');
    setIsFormVisible(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title ?? '');
    setFormCategory(goal.category ?? '');
    setIsFormVisible(true);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingGoal(null);
    setFormTitle('');
    setFormCategory('');
    setSavingGoal(false);
  };

  const handleSubmitGoal = async () => {
    if (!user?.uid) {
      showAlert({
        title: 'Sesion requerida',
        message: 'Inicia sesion para gestionar tus metas diarias.',
      });
      return;
    }

    const trimmedTitle = formTitle.trim();
    const trimmedCategory = formCategory.trim();
    if (!trimmedTitle) {
      showAlert({
        title: 'Titulo requerido',
        message: 'Escribe un titulo para la meta diaria.',
      });
      return;
    }

    setSavingGoal(true);
    try {
      if (editingGoal) {
        await updateDailyGoal(user.uid, editingGoal.id, {
          title: trimmedTitle,
          category: trimmedCategory || 'custom',
        });
      } else {
        await createDailyGoal(user.uid, {
          title: trimmedTitle,
          category: trimmedCategory || 'custom',
          isActive: true,
        });
      }
      handleCancelForm();
    } catch (error) {
      showAlert({
        title: 'Error',
        message:
          'No se pudo guardar la meta, intentalo de nuevo.',
      });
    } finally {
      setSavingGoal(false);
    }
  };

  const handleToggleToday = async (goal, doneToday) => {
    if (!user?.uid) {
      showAlert({
        title: 'Sesion requerida',
        message:
          'Inicia sesion para registrar el progreso de tus metas diarias.',
      });
      return;
    }

    if (doneToday) {
      Alert.alert(
        'Ya registrado',
        'Esta meta ya esta marcada como realizada hoy.',
      );
      return;
    }

    setTogglingGoalId(goal.id);
    try {
      await toggleGoalToday({ userUid: user.uid, goalId: goal.id });
    } catch (error) {
      showAlert({
        title: 'Error',
        message:
          'No se pudo guardar tu progreso, intentalo de nuevo.',
      });
    } finally {
      setTogglingGoalId(null);
    }
  };

  const handleDeactivateGoal = (goal) => {
    if (!user?.uid) {
      return;
    }

    Alert.alert(
      'Desactivar meta',
      'Esta meta dejara de aparecer en tu lista diaria, pero podras reactivarla mas adelante.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateDailyGoal(user.uid, goal.id);
            } catch (error) {
              showAlert({
                title: 'Error',
                message:
                  'No pudimos actualizar esta meta. Intentalo nuevamente.',
              });
            }
          },
        },
      ],
    );
  };

  const handleDeleteGoal = (goal) => {
    if (!user?.uid) {
      return;
    }

    Alert.alert(
      'Eliminar meta',
      'Esta accion eliminara la meta y su historial de check-ins. Esta operacion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDailyGoal(user.uid, goal.id);
            } catch (error) {
              showAlert({
                title: 'Error',
                message:
                  'No pudimos eliminar esta meta. Intentalo nuevamente.',
              });
            }
          },
        },
      ],
    );
  };

  const handleOpenDetail = (goal) => {
    navigation.navigate('DailyGoalDetail', {
      goalId: goal.id,
      goalTitle: goal.title ?? 'Meta diaria',
    });
  };

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
            Inicia sesion para gestionar tus metas diarias.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeGoals = goals.filter((goal) => goal.isActive !== false);

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
        <View style={[styles.content, contentWidthStyle]}>
          <PageHeader
            title="Metas diarias"
            subtitle="Marca tus acciones clave cada dǭa y sigue tu racha semanal."
          />

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.muted,
              },
            ]}
          >
            <View style={styles.formHeader}>
              <View style={styles.formTitleRow}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.formTitle,
                    { color: colors.text },
                  ]}
                >
                  {editingGoal
                    ? 'Editar meta diaria'
                    : 'Nueva meta diaria'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.formToggleButton,
                  {
                    borderColor: colors.primary,
                    backgroundColor: isFormVisible
                      ? colors.primary + '12'
                      : 'transparent',
                  },
                ]}
                onPress={
                  isFormVisible
                    ? handleCancelForm
                    : handleOpenCreateForm
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isFormVisible ? 'close' : 'add'}
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.formToggleLabel,
                    { color: colors.primary },
                  ]}
                >
                  {isFormVisible
                    ? 'Cerrar'
                    : 'Agregar meta'}
                </Text>
              </TouchableOpacity>
            </View>

            {isFormVisible ? (
              <View style={styles.formBody}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: colors.subText },
                  ]}
                >
                  Titulo de la meta
                </Text>
                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Ej: Tomar 2L de agua"
                  placeholderTextColor={colors.subText}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.muted,
                      color: colors.text,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.formLabel,
                    { color: colors.subText },
                  ]}
                >
                  Categoria (opcional)
                </Text>
                <TextInput
                  value={formCategory}
                  onChangeText={setFormCategory}
                  placeholder="Ej: salud, mindfulness, movimiento"
                  placeholderTextColor={colors.subText}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.muted,
                      color: colors.text,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      { borderColor: colors.muted },
                    ]}
                    onPress={handleCancelForm}
                    disabled={savingGoal}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.text },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                      },
                      savingGoal && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleSubmitGoal}
                    disabled={savingGoal}
                    activeOpacity={0.9}
                  >
                    {savingGoal ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator
                          size="small"
                          color={colors.primaryContrast}
                        />
                        <Text
                          style={[
                            styles.primaryButtonText,
                            { color: colors.primaryContrast },
                          ]}
                        >
                          Guardando...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: colors.primaryContrast },
                        ]}
                      >
                        {editingGoal ? 'Guardar cambios' : 'Crear meta'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text
                style={[
                  styles.formHelper,
                  { color: colors.subText },
                ]}
              >
                Crea metas sencillas como &quot;Tomar 2L de agua&quot; o
                &quot;Meditar 10 minutos&quot; y marca si las realizaste cada dǭa.
              </Text>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text },
              ]}
            >
              Metas activas
            </Text>
          </View>

          {goalsLoading ? (
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
                Cargando metas...
              </Text>
            </View>
          ) : activeGoals.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color={colors.subText}
              />
              <Text
                style={[
                  styles.centeredText,
                  { color: colors.subText },
                ]}
              >
                Todavia no tienes metas diarias. Crea la primera para comenzar.
              </Text>
            </View>
          ) : (
            activeGoals.map((goal) => {
              const checkins = checkinsByGoal[goal.id] ?? [];
              const doneToday = isGoalDoneToday(goal.id, checkins);
              const weekly = getWeeklyCompletion(
                checkins,
                new Date(),
              );

              return (
                <View
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.muted,
                    },
                  ]}
                >
                  <View style={styles.goalTopRow}>
                    <View style={styles.goalTitleBlock}>
                      <Text
                        style={[
                          styles.goalTitle,
                          { color: colors.text },
                        ]}
                      >
                        {goal.title}
                      </Text>
                      {goal.category ? (
                        <Text
                          style={[
                            styles.goalCategory,
                            { color: colors.subText },
                          ]}
                        >
                          Categoria: {goal.category}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.todayToggle,
                        {
                          borderColor: doneToday
                            ? colors.primary
                            : colors.muted,
                          backgroundColor: doneToday
                            ? colors.primary + '22'
                            : colors.muted,
                        },
                      ]}
                      onPress={() =>
                        handleToggleToday(goal, doneToday)
                      }
                      disabled={togglingGoalId === goal.id}
                      activeOpacity={0.85}
                    >
                      {togglingGoalId === goal.id ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            doneToday
                              ? colors.primary
                              : colors.text
                          }
                        />
                      ) : (
                        <Ionicons
                          name={
                            doneToday
                              ? 'checkmark-circle'
                              : 'ellipse-outline'
                          }
                          size={18}
                          color={
                            doneToday
                              ? colors.primary
                              : colors.text
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.todayToggleLabel,
                          {
                            color: doneToday
                              ? colors.primary
                              : colors.text,
                          },
                        ]}
                      >
                        {doneToday ? 'Hecho hoy' : 'No hecho'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalMetaRow}>
                    <View style={styles.goalMetaItem}>
                      <Text
                        style={[
                          styles.goalMetaLabel,
                          { color: colors.subText },
                        ]}
                      >
                        Cumplimiento semanal
                      </Text>
                      <Text
                        style={[
                          styles.goalMetaValue,
                          { color: colors.text },
                        ]}
                      >
                        {weekly.completedDays}/{weekly.totalDays} (
                        {weekly.completionPercent}%)
                      </Text>
                    </View>
                    <View style={styles.goalMetaItem}>
                      <Text
                        style={[
                          styles.goalMetaLabel,
                          { color: colors.subText },
                        ]}
                      >
                        Racha actual
                      </Text>
                      <Text
                        style={[
                          styles.goalMetaValue,
                          { color: colors.text },
                        ]}
                      >
                        {goal.currentStreakWeeks ?? 0} semana
                        {goal.currentStreakWeeks === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={styles.goalMetaItem}>
                      <Text
                        style={[
                          styles.goalMetaLabel,
                          { color: colors.subText },
                        ]}
                      >
                        Mejor racha
                      </Text>
                      <Text
                        style={[
                          styles.goalMetaValue,
                          { color: colors.text },
                        ]}
                      >
                        {goal.bestStreakWeeks ?? 0} semana
                        {goal.bestStreakWeeks === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => handleOpenDetail(goal)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.smallButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Ver semana
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        { borderColor: colors.muted },
                      ]}
                      onPress={() => handleEditGoal(goal)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={colors.text}
                      />
                      <Text
                        style={[
                          styles.smallButtonText,
                          { color: colors.text },
                        ]}
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        { borderColor: colors.danger ?? '#ef4444' },
                      ]}
                      onPress={() => handleDeactivateGoal(goal)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="archive-outline"
                        size={16}
                        color={colors.danger ?? '#ef4444'}
                      />
                      <Text
                        style={[
                          styles.smallButtonText,
                          {
                            color: colors.danger ?? '#ef4444',
                          },
                        ]}
                      >
                        Desactivar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        { borderColor: colors.muted },
                      ]}
                      onPress={() => handleDeleteGoal(goal)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.subText}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyGoalsScreen;

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
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  formToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  formToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  formBody: {
    gap: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formHelper: {
    fontSize: 13,
    lineHeight: 18,
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  goalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  todayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayToggleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalMetaItem: {
    minWidth: '30%',
    gap: 2,
  },
  goalMetaLabel: {
    fontSize: 12,
  },
  goalMetaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
