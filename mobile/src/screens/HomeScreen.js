import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

import { auth, db } from './firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

// Pantalla principal que muestra resumen diario y accesos a herramientas clave.
const emojiCodePoints = {
  happy: 0x1f60a,
  calm: 0x1f60c,
  sad: 0x1f622,
  anxious: 0x1f630,
  angry: 0x1f620,
  alegre: 0x1f600,
  agradecido: 0x1f64f,
  tranquilo: 0x1f60c,
  motivado: 0x1f4aa,
  energico: 0x26a1,
  estresado: 0x1f62b,
  ansioso: 0x1f630,
  cansado: 0x1f971,
  triste: 0x1f622,
  enojado: 0x1f620,
  neutral: 0x1f642,
};

const quickActions = [
  {
    title: 'Registrar ánimo',
    description: 'Elige hasta tres emojis y recibe sugerencias personalizadas.',
    icon: 'happy-outline',
    color: '#8b5cf6',
    target: 'Mood',
  },
  {
    title: 'Hábitos diarios',
    description: 'Lleva el control de tus micro rutinas para mantener el balance.',
    icon: 'calendar-outline',
    color: '#f97316',
    target: 'Habits',
  },
  {
    title: 'Foro de ayuda',
    description: 'Comparte experiencias y motivación con la comunidad.',
    icon: 'people-outline',
    color: '#ec4899',
    target: 'HelpForum',
  },
  {
    title: 'Red de apoyo',
    description: 'Gestiona amistades y conversa con quienes confias.',
    icon: 'chatbubbles-outline',
    color: '#6366f1',
    target: 'Social',
  },
  {
    title: 'Diario personal',
    description: 'Registra pensamientos o logros para celebrar tu progreso.',
    icon: 'book-outline',
    color: '#10b981',
    target: 'Journal',
  },
];
console.log('soy dross')
export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const user = auth.currentUser;
  const slideAnim = useRef(new Animated.Value(-320)).current;

  const [menuVisible, setMenuVisible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lastMood, setLastMood] = useState('calm');

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const cardSpacing = width >= 768 ? 24 : 16;
  const maxContentWidth = Math.min(960, width * 0.95);
  const menuWidth = Math.min(360, Math.max(260, width * 0.8));
  const isWide = width >= 768;
  const actionFlexBasis = isWide ? `${100 / Math.min(3, Math.ceil(width / 320))}%` : '100%';

  const fallbackName = useMemo(() => {
    if (user?.displayName?.trim()) {
      return user.displayName.trim();
    }
    if (user?.email?.trim()) {
      return user.email.trim().split('@')[0];
    }
    return 'Invitado';
  }, [user?.displayName, user?.email]);

  const userEmail = useMemo(() => user?.email ?? 'usuario@balanceme.com', [user?.email]);

  const displayName = useMemo(() => {
    if (!fallbackName) {
      return 'Usuario';
    }
    return fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
  }, [fallbackName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Buenos dias';
    }
    if (hour < 19) {
      return 'Buenas tardes';
    }
    return 'Buenas noches';
  }, []);

  const personalizedTip = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 9) {
      return 'Comienza el dáa con cinco minutos de respiración consciente.';
    }
    if (hour >= 12 && hour < 15) {
      return 'Toma una pausa al mediodia y haz estiramientos suaves.';
    }
    if (hour >= 18) {
      return 'Cierra la jornada escribiendo un breve balance en tu diario.';
    }
    return 'Registra cómo te sientes ahora para seguir tu progreso.';
  }, []);


// Recupera registros recientes para calcular la racha e identificar el último estado.
useEffect(() => {
  if (!user?.uid) {
    setCurrentStreak(0);
    setLastMood('calm');
    return;
  }

  let isMounted = true;
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfDay = (value) => {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Resume los registros recientes y calcula estadísticas básicas.
  const fetchMoodSummary = async () => {
    try {
      const moodsRef = collection(db, 'users', user.uid, 'moods');
      const moodsQuery = query(moodsRef, orderBy('createdAt', 'desc'), limit(60));
      const snapshot = await getDocs(moodsQuery);
      if (!isMounted) {
        return;
      }
      if (snapshot.empty) {
        setCurrentStreak(0);
        setLastMood('calm');
        return;
      }

      const uniqueDays = [];
      const daySet = new Set();
      let latestEmojiName = 'calm';

      snapshot.forEach((document) => {
        const data = document.data();
        if (!data) {
          return;
        }
        if (Array.isArray(data.emojis) && data.emojis.length && latestEmojiName === 'calm') {
          latestEmojiName = data.emojis[0];
        }
        const timestamp = data.createdAt ?? data.createdAtServer;
        const date = timestamp?.toDate ? timestamp.toDate() : null;
        if (!date) {
          return;
        }
        const key = date.toISOString().slice(0, 10);
        if (!daySet.has(key)) {
          daySet.add(key);
          uniqueDays.push(date);
        }
      });

      uniqueDays.sort((a, b) => startOfDay(b).getTime() - startOfDay(a).getTime());

      if (!uniqueDays.length) {
        setCurrentStreak(0);
      } else {
        let streak = 0;
        let expected = startOfDay(uniqueDays[0]);
        for (const currentDay of uniqueDays) {
          const normalizedDay = startOfDay(currentDay);
          const diff = Math.round((expected.getTime() - normalizedDay.getTime()) / dayMs);
          if (diff === 0) {
            streak += 1;
            expected = new Date(expected.getTime() - dayMs);
          } else {
            break;
          }
        }
        setCurrentStreak(streak);
      }

      if (!emojiCodePoints[latestEmojiName]) {
        latestEmojiName = 'neutral';
      }
      setLastMood(latestEmojiName);
    } catch (error) {
      if (isMounted) {
        setCurrentStreak(0);
        setLastMood('calm');
      }
    }
  };

  fetchMoodSummary();

  return () => {
    isMounted = false;
  };
}, [user?.uid]);

  // Controla la animación del menú lateral y su visibilidad.
  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -320,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
      return;
    }
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // Cierra la sesión del usuario y devuelve a la pantalla de login.
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      // Mantener un fallback silencioso por ahora
    }
  };

  // Navega según la opción seleccionada y maneja acciones especiales como logout.
  const handleMenuOption = (target) => {
    toggleMenu();
    if (!target) {
      return;
    }
    setTimeout(() => {
      if (target === 'logout') {
        handleLogout();
        return;
      }
      if (target === 'Exercises') {
        Alert.alert('Muy pronto', 'Estamos preparando esta sección para ti.');
        return;
      }
      navigation.navigate(target);
    }, 260);
  };

  // Convierte el último estado de ánimo guardado en su emoji correspondiente.
  const moodEmoji = useMemo(() => {
    const codePoint = emojiCodePoints[lastMood] ?? 0x1f642;
    return String.fromCodePoint(codePoint);
  }, [lastMood]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 32, paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.menuButton, styles.menuFloating, { borderColor: colors.muted, backgroundColor: colors.surface }]}
              onPress={toggleMenu}
              activeOpacity={0.85}
            >
              <Ionicons name="menu" size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.brand}>
              <View
                style={[styles.logoContainer, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              >
                <Ionicons name="heart" size={32} color={colors.primaryContrast} />
              </View>
              <Text style={[styles.appTitle, { color: colors.text }]}>BalanceMe</Text>
              <Text style={[styles.appSubtitle, { color: colors.subText }]}>Tu espacio de bienestar</Text>
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.outline, gap: cardSpacing }]}
          >
            <Text style={[styles.greetingText, { color: colors.subText }]}>{`${greeting}, ${displayName}`}</Text>
            <Text style={[styles.questionText, { color: colors.text }]}>{'\u00bf'}Como te sientes hoy?</Text>
            <View style={[styles.horizontalDivider, { backgroundColor: colors.muted }]} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Ionicons name="flame" size={20} color="#f97316" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>{currentStreak}</Text>
                <Text style={[styles.summaryLabel, { color: colors.subText }]}>dias de racha</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.muted }]} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryEmoji}>{moodEmoji}</Text>
                <Text style={[styles.summaryLabel, { color: colors.subText }]}>Ultimo registro</Text>
              </View>
            </View>
            <Text style={[styles.tipHelper, { color: colors.subText }]}>{personalizedTip}</Text>
          </View>

          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones rapidas</Text>
            <View style={[styles.actionsGrid, { gap: cardSpacing, flexDirection: isWide ? 'row' : 'column', flexWrap: 'wrap' }]}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.title}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.surface,
                      shadowColor: colors.outline,
                      flexBasis: actionFlexBasis,
                      maxWidth: actionFlexBasis,
                    },
                  ]}
                  onPress={() => {
                    if (action.target) {
                      navigation.navigate(action.target);
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: action.color + '22' }]}
                  >
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
                    <Text style={[styles.actionDescription, { color: colors.subText }]}>{action.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.subText} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.outline, gap: cardSpacing }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recuerda</Text>
            <TouchableOpacity
              style={[styles.emergencyButton, { borderColor: colors.danger + '33', backgroundColor: colors.danger + '11' }]}
              activeOpacity={0.9}
            >
              <Ionicons name="call-outline" size={20} color={colors.danger} />
              <Text style={[styles.emergencyText, { color: colors.danger }]}>Busca apoyo profesional si lo necesitas</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </TouchableOpacity>
            <Text style={[styles.motivationalText, { color: colors.subText }]}>
              Cada registro suma. Tu bienestar se construye paso a paso.
            </Text>
          </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.floatingButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary, right: horizontalPadding },
          ]}
          onPress={() => navigation.navigate('SupportChat')}
          activeOpacity={0.9}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={colors.primaryContrast} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={toggleMenu}>
          <Animated.View
            style={[
              styles.sideMenu,
              {
                backgroundColor: colors.surface,
                borderColor: colors.muted,
                shadowColor: colors.outline,
                width: menuWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={[styles.menuHeader, { backgroundColor: colors.muted }]}>
              <View style={[styles.menuProfileIcon, { backgroundColor: colors.primary + '22' }]}
              >
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.menuUserName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.menuUserEmail, { color: colors.subText }]}>{userEmail}</Text>
            </View>

            <View style={styles.menuOptions}>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('Profile')} activeOpacity={0.85}>
                <Ionicons name="person-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Perfil</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('Habits')} activeOpacity={0.85}>
                <Ionicons name="leaf-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Habitos</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('Journal')} activeOpacity={0.85}>
                <Ionicons name="book-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Journal</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('HelpForum')} activeOpacity={0.85}>
                <Ionicons name="people-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Foro</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('Social')} activeOpacity={0.85}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Red de apoyo</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('Settings')} activeOpacity={0.85}>
                <Ionicons name="settings-outline" size={22} color={colors.text} />
                <Text style={[styles.menuOptionText, { color: colors.text }]}>Configuracion</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.subText} />
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: colors.muted }]} />
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('logout')} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                <Text style={[styles.menuOptionText, { color: colors.danger }]}>Cerrar sesion</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
  },
  horizontalDivider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 16,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryEmoji: {
    fontSize: 28,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#e5e7eb',
  },
  tipHelper: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  actionsSection: {
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  motivationalText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuFloating: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sideMenu: {
    width: 280,
    height: '100%',
    paddingHorizontal: 24,
    paddingTop: 32,
    borderRightWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  menuHeader: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
    borderRadius: 24,
    marginBottom: 16,
  },
  menuProfileIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuUserEmail: {
    fontSize: 13,
  },
  menuOptions: {
    width: '100%',
    gap: 4,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
});
