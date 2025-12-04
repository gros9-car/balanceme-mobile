import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { auth, db } from './firebase/config';
import { useAppAlert } from '../context/AppAlertContext';
import {
  scheduleNextEmotionReminderFromLastDate,
  scheduleNextHabitReminderFromLastDate,
  cancelEmotionReminder,
  cancelHabitReminder,
} from '../services/reminderNotifications';
import {
  getNotificationSettingsForUser,
  updateNotificationSettingsForUser,
} from '../services/notificationSettings';
import {
  getNextEmotionEnableDate,
  getNextHabitEnableDate,
} from '../utils/reminderRules';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionsIfNeeded,
} from '../hooks/useNotificationSetup';

const ThemeOption = ({ mode, label, description, isActive, onPress, colors }) => {
  const borderColor = isActive ? colors.accent : colors.muted;
  const backgroundColor = isActive ? colors.accent : colors.surface;
  const textColor = isActive ? colors.primaryContrast : colors.text;
  const iconColor = isActive ? colors.primaryContrast : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(mode)}
      style={[styles.option, { borderColor, backgroundColor }]}
    >
      <View style={styles.optionHeader}>
        <Ionicons
          name={
            mode === 'system'
              ? 'phone-portrait-outline'
              : mode === 'dark'
              ? 'moon-outline'
              : 'sunny-outline'
          }
          size={22}
          color={iconColor}
        />
        <Text style={[styles.optionTitle, { color: textColor }]}>{label}</Text>
      </View>
      <Text
        style={[
          styles.optionDescription,
          { color: isActive ? colors.primaryContrast : colors.subText },
        ]}
      >
        {description}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Pantalla de configuración de la cuenta y la app.
 * Permite ajustar tema, notificaciones, privacidad y otras
 * preferencias del usuario autenticado.
 */
export default function SettingsScreen({ navigation }) {
  const { colors, theme, setTheme, effectiveTheme } = useTheme();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    safeTop,
    safeBottom,
  } = useResponsiveLayout({ maxContentWidth: 640 });
  const { showAlert } = useAppAlert();
  const user = auth.currentUser;
  const userUid = user?.uid ?? null;

  const [emotionsReminderEnabled, setEmotionsReminderEnabled] = useState(false);
  const [habitsReminderEnabled, setHabitsReminderEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [systemPermissionStatus, setSystemPermissionStatus] = useState(null);

  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  const currentModeLabel = useMemo(() => {
    if (theme === 'system') {
      return effectiveTheme === 'dark' ? 'Sistema (oscuro)' : 'Sistema (claro)';
    }
    return theme === 'dark' ? 'Oscuro' : 'Claro';
  }, [theme, effectiveTheme]);

  const systemPermissionLabel = useMemo(() => {
    if (!systemPermissionStatus) {
      return 'Comprobando permisos del sistema...';
    }

    const granted =
      systemPermissionStatus.granted ||
      systemPermissionStatus.status === 'granted';

    return granted ? 'Permitidas' : 'Bloqueadas o restringidas';
  }, [systemPermissionStatus]);

  const handleThemeChange = (mode) => {
    setTheme(mode);
  };

  useEffect(() => {
    let cancelled = false;

    const loadPermissionStatusAsync = async () => {
      try {
        const settings = await getNotificationPermissionStatus();
        if (!cancelled) {
          setSystemPermissionStatus(settings);
        }
      } catch {
        if (!cancelled) {
          setSystemPermissionStatus(null);
        }
      }
    };

    loadPermissionStatusAsync();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSettingsAsync = async () => {
      if (!userUid) {
        setEmotionsReminderEnabled(false);
        setHabitsReminderEnabled(false);
        setLoadingSettings(false);
        return;
      }

      setLoadingSettings(true);
      try {
        const settings = await getNotificationSettingsForUser(userUid);
        if (cancelled) return;

        setEmotionsReminderEnabled(Boolean(settings.emotionsReminderEnabled));
        setHabitsReminderEnabled(Boolean(settings.habitsReminderEnabled));
      } catch {
        if (!cancelled) {
          setEmotionsReminderEnabled(false);
          setHabitsReminderEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingSettings(false);
        }
      }
    };

    loadSettingsAsync();

    return () => {
      cancelled = true;
    };
  }, [userUid]);

  const handleToggleEmotionsReminder = async (nextValue) => {
    if (!userUid) {
      showAlert({
        title: 'Sesion requerida',
        message: 'Inicia sesion para configurar tus recordatorios.',
      });
      return;
    }

    if (nextValue) {
      const granted = await requestNotificationPermissionsIfNeeded();
      if (!granted) {
        showAlert({
          title: 'Permiso requerido',
          message:
            'Las notificaciones de BalanceMe están desactivadas a nivel de sistema. Actívalas en los ajustes del dispositivo para recibir recordatorios.',
          confirmText: 'Ver cómo activarlas',
          cancelText: 'Más tarde',
          onConfirm: () => {
            navigation.navigate('NotificationPermissions');
          },
        });
        setEmotionsReminderEnabled(false);
        await updateNotificationSettingsForUser(userUid, {
          emotionsReminderEnabled: false,
        });
        await cancelEmotionReminder({ userUid });
        return;
      }

      setEmotionsReminderEnabled(true);
      await updateNotificationSettingsForUser(userUid, {
        emotionsReminderEnabled: true,
      });

      try {
        const moodsCollection = collection(db, 'users', userUid, 'moods');
        const latestQuery = query(
          moodsCollection,
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const snapshot = await getDocs(latestQuery);
        if (snapshot.empty) return;

        const data = snapshot.docs[0].data() ?? {};
        const ts = data.createdAt ?? data.createdAtServer;
        const lastDate = ts?.toDate ? ts.toDate() : null;
        const nextDate = getNextEmotionEnableDate(lastDate);
        if (nextDate && nextDate > new Date()) {
          await scheduleNextEmotionReminderFromLastDate(lastDate, userUid);
        }
      } catch {
        // No romper la pantalla si falla la programacion.
      }
    } else {
      setEmotionsReminderEnabled(false);
      await updateNotificationSettingsForUser(userUid, {
        emotionsReminderEnabled: false,
      });
      await cancelEmotionReminder({ userUid });
    }
  };

  const handleToggleHabitsReminder = async (nextValue) => {
    if (!userUid) {
      showAlert({
        title: 'Sesion requerida',
        message: 'Inicia sesion para configurar tus recordatorios.',
      });
      return;
    }

    if (nextValue) {
      const granted = await requestNotificationPermissionsIfNeeded();
      if (!granted) {
        showAlert({
          title: 'Permiso requerido',
          message:
            'Las notificaciones de BalanceMe estǭn desactivadas a nivel de sistema. Act�valas en los ajustes del dispositivo para recibir recordatorios.',
          confirmText: 'Ver c��mo activarlas',
          cancelText: 'Mǭs tarde',
          onConfirm: () => {
            navigation.navigate('NotificationPermissions');
          },
        });
        setHabitsReminderEnabled(false);
        await updateNotificationSettingsForUser(userUid, {
          habitsReminderEnabled: false,
        });
        await cancelHabitReminder({ userUid });
        return;
      }

      setHabitsReminderEnabled(true);
      await updateNotificationSettingsForUser(userUid, {
        habitsReminderEnabled: true,
      });

      try {
        const habitsCollection = collection(db, 'users', userUid, 'habits');
        const latestQuery = query(
          habitsCollection,
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const snapshot = await getDocs(latestQuery);
        if (snapshot.empty) return;

        const data = snapshot.docs[0].data() ?? {};
        const ts = data.createdAt ?? data.createdAtServer;
        const lastDate = ts?.toDate ? ts.toDate() : null;
        const nextDate = getNextHabitEnableDate(lastDate);
        if (nextDate && nextDate > new Date()) {
          await scheduleNextHabitReminderFromLastDate(lastDate, userUid);
        }
      } catch {
        // No romper la pantalla si falla la programacion.
      }
    } else {
      setHabitsReminderEnabled(false);
      await updateNotificationSettingsForUser(userUid, {
        habitsReminderEnabled: false,
      });
      await cancelHabitReminder({ userUid });
    }
  };

  const topBarPaddingBottom = Math.max(4, verticalPadding * 0.25);
  const contentPaddingTop = Math.max(8, verticalPadding * 0.35);

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
      <StatusBar barStyle={colors.statusBarStyle} />

      <View
        style={[
          styles.topBarWrapper,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: topBarPaddingBottom,
          },
        ]}
      >
        <View style={contentWidthStyle}>
          <PageHeader title="Configuración" subtitle="Personaliza BalanceMe" />
        </View>
      </View>

      <View
        style={[
          styles.headerIconFloating,
          {
            right: horizontalPadding,
            top: safeTop + 8,
          },
        ]}
      >
        <View
          style={[
            styles.headerIconContainer,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
          ]}
        >
          <Ionicons name="settings-outline" size={28} color={colors.primaryContrast} />
        </View>
      </View>

      <View
        style={[
          styles.contentWrapper,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: verticalPadding,
            paddingTop: contentPaddingTop,
          },
        ]}
      >
        <View style={[styles.content, contentWidthStyle]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
            <Text style={[styles.sectionHelper, { color: colors.subText }]}>
              Modo actual: {currentModeLabel}
            </Text>

            <ThemeOption
              mode="light"
              label="Modo claro"
              description="Iluminacion suave ideal para espacios con buena luz."
              isActive={theme === 'light'}
              onPress={handleThemeChange}
              colors={colors}
            />
            <ThemeOption
              mode="dark"
              label="Modo oscuro"
              description="Contraste alto para cuidar tu vista en ambientes nocturnos."
              isActive={theme === 'dark'}
              onPress={handleThemeChange}
              colors={colors}
            />
            <ThemeOption
              mode="system"
              label="Seguir al sistema"
              description="BalanceMe adaptara automaticamente el tema de tu dispositivo."
              isActive={theme === 'system'}
              onPress={handleThemeChange}
              colors={colors}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificaciones</Text>
            <Text style={[styles.sectionHelper, { color: colors.subText }]}>
              Activa recordatorios diarios para mantener tus registros al dia.
            </Text>
            <Text style={[styles.sectionHelper, { color: colors.subText }]}>
              Estado del sistema: {systemPermissionLabel}
            </Text>
            <TouchableOpacity
              style={[styles.linkButton, { borderColor: colors.muted }]}
              onPress={() => navigation.navigate('NotificationPermissions')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.linkButtonText, { color: colors.primary }]}
              >
                Revisar permisos de notificación
              </Text>
            </TouchableOpacity>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  Recordatorios de emociones
                </Text>
                <Text style={[styles.toggleHelper, { color: colors.subText }]}>
                  Te avisaremos cuando vuelva a estar disponible "Ingresar emociones".
                </Text>
              </View>
              <Switch
                value={emotionsReminderEnabled}
                onValueChange={handleToggleEmotionsReminder}
                disabled={loadingSettings}
                trackColor={{ false: colors.muted, true: colors.primary + '66' }}
                thumbColor={emotionsReminderEnabled ? colors.primary : colors.surface}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  Recordatorios de hábitos
                </Text>
                <Text style={[styles.toggleHelper, { color: colors.subText }]}>
                  Te avisaremos cuando vuelva a estar disponible "Ingresar hábitos".
                </Text>
              </View>
              <Switch
                value={habitsReminderEnabled}
                onValueChange={handleToggleHabitsReminder}
                disabled={loadingSettings}
                trackColor={{ false: colors.muted, true: colors.primary + '66' }}
                thumbColor={habitsReminderEnabled ? colors.primary : colors.surface}
              />
            </View>
          </View>

        
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarWrapper: {
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
  },
  content: {
    width: '100%',
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHelper: {
    fontSize: 13,
  },
  headerIconFloating: {
    position: 'absolute',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextBlock: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleHelper: {
    fontSize: 13,
  },
  option: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});