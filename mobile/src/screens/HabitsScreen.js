import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

// Normaliza una fecha para comparar días sin considerar horas.
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Convierte fechas a texto manejando fallos silenciosos.
const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};



const habitAgentProfiles = {
  movimiento: {
    keywords: ['correr', 'caminar', 'yoga', 'ejercicio', 'entren', 'pesas', 'bicicleta', 'ruta', 'gimnasio', 'cardio', 'pilates', 'baile'],
    summary: 'Tu rutina muestra intención de movimiento y actividad física.',
    tips: [
      'Recuerda hidratarte y realizar estiramientos de recuperación.',
      'Suma breves pausas de respiración para equilibrar energía.',
    ],
  },
  descanso: {
    keywords: ['descans', 'dorm', 'siesta', 'relaj', 'sueño', 'acostar', 'despert'],
    summary: 'Estás priorizando el descanso, lo cual ayuda a tu balance.',
    tips: [
      'Mantener horarios constantes mejora la calidad del descanso.',
      'Describe cómo te sentiste al despertar para seguir midiendo tu energía.',
    ],
  },
  alimentacion: {
    keywords: ['comida', 'vegetal', 'fruta', 'nutric', 'cena', 'almuerzo', 'diet', 'agua', 'hidrata'],
    summary: 'Tu plan refleja conciencia sobre la alimentación.',
    tips: [
      'Anota cómo te sientes después de comer para identificar patrones.',
      'Acompaña tus comidas con pausas de respiración para digerir mejor.',
    ],
  },
  mindfulness: {
    keywords: ['medit', 'respir', 'gratitud', 'diario', 'afirmacion', 'mindfulness', 'atencion plena', 'oracion'],
    summary: 'Estás cultivando la presencia y el bienestar emocional.',
    tips: [
      'Realiza tres respiraciones profundas antes de comenzar tus actividades clave.',
      'Registra una frase que resuma la calma que obtuviste.',
    ],
  },
  social: {
    keywords: ['familia', 'amiga', 'pareja', 'salir', 'convers', 'llam', 'compart'],
    summary: 'Incluiste momentos de conexión social en tu día.',
    tips: [
      'Agradece el impacto positivo que esas interacciones generaron.',
      'Planifica el siguiente espacio de conexión para mantener la energía.',
    ],
  },
  trabajo: {
    keywords: ['trabajo', 'estudio', 'proyecto', 'tarea', 'objetivo', 'plan', 'reunion'],
    summary: 'Estas organizando tus responsabilidades con intención.',
    tips: [
      'Reserva micro descansos para evitar la fatiga mental.',
      'Celebra el avance alcanzado por pequeño que parezca.',
    ],
  },
  autocuidado: {
    keywords: ['autocuidado', 'spa', 'rutina de piel', 'leer', 'series', 'hobby', 'creativ', 'arte'],
    summary: 'Tu plan contiene momentos de autocuidado y disfrute.',
    tips: [
      'Describe la sensación que buscabas al darte ese espacio.',
      'Registra tres cosas que agradeces de ese momento personal.',
    ],
  },
};

const fallbackAgentResponse = {
  summary: 'Gracias por compartir tus hábitos. Mantener registros te ayuda a ver tu progreso.',
  tips: [
    'Agrega detalles sobre cómo te sentiste antes y después de cada hábito.',
    'Incluye un micro-hábito que puedas repetir mañana para sostener la racha.',
  ],
};

// Analiza el texto de hábitos para generar un resumen y sugerencias.
const analyzeHabitsEntry = (text) => {
  const normalized = text.toLowerCase();
  const scores = {};

  Object.entries(habitAgentProfiles).forEach(([category, profile]) => {
    if (profile.keywords.some((keyword) => normalized.includes(keyword))) {
      scores[category] = (scores[category] ?? 0) + 1;
    }
  });

  const categories = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  if (!categories.length) {
    return fallbackAgentResponse;
  }

  const bestCategory = categories[0];
  const secondCategory = categories[1];

  const baseSummary = habitAgentProfiles[bestCategory]?.summary ?? fallbackAgentResponse.summary;
  const extendedSummary = secondCategory
    ? `${baseSummary} También resaltas acciones relacionadas con ${secondCategory}.`
    : baseSummary;

  const tips = [
    ...(habitAgentProfiles[bestCategory]?.tips ?? []),
    ...(secondCategory ? habitAgentProfiles[secondCategory]?.tips ?? [] : []),
  ];

  const uniqueTips = [];
  tips.forEach((tip) => {
    if (!uniqueTips.includes(tip)) {
      uniqueTips.push(tip);
    }
  });

  if (!uniqueTips.length) {
    uniqueTips.push(...fallbackAgentResponse.tips);
  }

  return {
    summary: extendedSummary,
    tips: uniqueTips.slice(0, 3),
  };
};

// Pantalla de hábitos que registra actividades diarias y ofrece sugerencias del agente.
export default function HabitsScreen({ navigation }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const user = auth.currentUser;

  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  // Estado para respiración cuadrada
  const [breathingVisible, setBreathingVisible] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const anim = useRef(new Animated.Value(0)).current; // 0..1 (escala)
  const timersRef = useRef([]);
  const [soundOn, setSoundOn] = useState(true);

  const todayLabel = useMemo(() => formatDate(new Date()), []);
  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const contentStyle = useMemo(() => ({
    paddingHorizontal: horizontalPadding,
    width: '100%',
    maxWidth: Math.min(920, width * 0.95),
    alignSelf: 'center',
  }), [horizontalPadding, width]);

  useEffect(() => {
    // Escucha los últimos registros para mostrar historial y validar el límite diario.
    if (!user?.uid) {
      setEntries([]);
      setHasTodayEntry(false);
      setLoading(false);
      return undefined;
    }

    const habitsRef = collection(db, 'users', user.uid, 'habits');
    const habitsQuery = query(habitsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          const timestamp = data.createdAt ?? data.createdAtServer;
          const createdAt = timestamp?.toDate ? timestamp.toDate() : new Date();
          return {
            id: docSnapshot.id,
            content: typeof data.content === 'string' ? data.content : '',
            summary: typeof data.agentSummary === 'string' ? data.agentSummary : '',
            tips: Array.isArray(data.agentTips) ? data.agentTips : [],
            createdAt,
          };
        });

        setEntries(nextEntries);
        const today = startOfDay(new Date()).getTime();
        const foundToday = nextEntries.some((entry) => startOfDay(entry.createdAt).getTime() === today);
        setHasTodayEntry(foundToday);
        setLoading(false);
      },
      () => {
        setEntries([]);
        setHasTodayEntry(false);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  // Limpia timers al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // Guarda la entrada del día y guarda el análisis generado automáticamente.
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para registrar tus hábitos.');
      navigation?.replace?.('Login');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Contenido requerido', 'Describe al menos un hábito para guardar.');
      return;
    }

    if (hasTodayEntry) {
      Alert.alert('Registro existente', 'Sólo puedes registrar tus hábitos una vez por día.');
      return;
    }

    const agentResponse = analyzeHabitsEntry(trimmed);

    setSaving(true);
    try {
      const habitsRef = collection(db, 'users', user.uid, 'habits');
      await addDoc(habitsRef, {
        content: trimmed,
        agentSummary: agentResponse.summary,
        agentTips: agentResponse.tips,
        createdAt: serverTimestamp(),
      });
      setDraft('');
      Alert.alert('Hábitos registrados', 'Tu entrada fue analizada y guardada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tus hábitos. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const openBreathing = () => {
    // Reset estado
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    anim.stopAnimation();
    anim.setValue(0);
    setCurrentCycle(1);
    setBreathingPhase('Inhala');
    setSecondsLeft(4);
    setBreathingVisible(true);
    startCycle(1, 0);
  };

  const closeBreathing = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    anim.stopAnimation();
    try { Speech.stop(); } catch {}
    setBreathingVisible(false);
  };

  const stepPlan = [
    { label: 'Inhala', duration: 4000, animate: 'inhale' },
    { label: 'Mantén', duration: 4000, animate: 'hold' },
    { label: 'Exhala', duration: 4000, animate: 'exhale' },
    { label: 'Espera', duration: 4000, animate: 'hold' },
  ];

  const runCountdown = (ms) => {
    setSecondsLeft(Math.ceil(ms / 1000));
    let remaining = ms;
    const tick = () => {
      remaining -= 1000;
      if (remaining >= 0) setSecondsLeft(Math.ceil(remaining / 1000));
    };
    for (let i = 1; i <= Math.floor(ms / 1000); i += 1) {
      const t = setTimeout(tick, i * 1000);
      timersRef.current.push(t);
    }
  };

  const startCycle = (cycleIndex, stepIndex) => {
    if (cycleIndex > 4) {
      setBreathingPhase('Completado');
      setSecondsLeft(0);
      if (soundOn) {
        try { Speech.speak('Completado', { language: 'es-ES' }); } catch {}
      }
      return;
    }
    const step = stepPlan[stepIndex];
    setBreathingPhase(step.label);
    setCurrentCycle(cycleIndex);
    runCountdown(step.duration);

    if (soundOn) {
      try {
        let phrase = step.label;
        if (phrase.toLowerCase().startsWith('mant')) phrase = 'Manten';
        Speech.speak(phrase, { language: 'es-ES' });
      } catch {}
    }

    if (step.animate === 'inhale') {
      Animated.timing(anim, { toValue: 1, duration: step.duration, useNativeDriver: true }).start();
    } else if (step.animate === 'exhale') {
      Animated.timing(anim, { toValue: 0, duration: step.duration, useNativeDriver: true }).start();
    }

    const next = setTimeout(() => {
      const nextStep = (stepIndex + 1) % stepPlan.length;
      const nextCycle = nextStep === 0 ? cycleIndex + 1 : cycleIndex;
      startCycle(nextCycle, nextStep);
    }, step.duration);
    timersRef.current.push(next);
  };

  if (!user?.uid) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.subText} />
          <Text style={[styles.centeredText, { color: colors.subText }]}>Inicia sesion para gestionar tus habitos.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const disableSubmit = saving || hasTodayEntry;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={[styles.scrollContainer, contentStyle]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Habitos diarios</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Escribe como cuidaste tu bienestar hoy y recibe sugerencias.</Text>
        </View>

        <View style={[styles.editorCard, { backgroundColor: colors.surface, shadowColor: colors.outline }]}>
          <View style={styles.editorHeader}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.badgeTextBlock}>
              <Text style={[styles.badgeLabel, { color: colors.subText }]}>Habitos de hoy</Text>
              <Text style={[styles.badgeValue, { color: colors.text }]}>{todayLabel}</Text>
            </View>
          </View>
          {hasTodayEntry ? (
            <Text style={[styles.infoText, { color: colors.subText }]}>Ya registraste tus habitos del dia. Mañana tendremos nuevas sugerencias para ti.</Text>
          ) : (
            <Text style={[styles.infoText, { color: colors.subText }]}>Cuenta que acciones realizaste: movimiento, alimentacion, descanso, conexiones, etc.</Text>
          )}
          <TouchableOpacity
            style={[styles.breatheButton, { borderColor: colors.primary, backgroundColor: colors.primary + '11' }]}
            onPress={openBreathing}
            activeOpacity={0.9}
          >
            <Ionicons name="pause-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.breatheButtonText, { color: colors.primary }]}>Respiración cuadrada (4-4-4-4)</Text>
          </TouchableOpacity>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Por ejemplo: Camina 20 minutos, practica agradecimiento antes de cenar..."
            placeholderTextColor={colors.subText}
            multiline
            textAlignVertical="top"
            style={[styles.textArea, { borderColor: colors.muted, color: colors.text, backgroundColor: colors.muted }]}
            editable={!hasTodayEntry}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, disableSubmit && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={disableSubmit}
            activeOpacity={0.9}
          >
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primaryContrast} />
                <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>Guardando...</Text>
              </View>
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>Guardar habitos</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.timelineHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Entradas anteriores</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>Cargando habitos...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="leaf-outline" size={24} color={colors.subText} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>Todavia no registras habitos.</Text>
          </View>
        ) : (
          entries.map((entry) => {
            const formatted = formatDate(entry.createdAt);
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
              >
                <View style={styles.entryHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.entryDate, { color: colors.subText }]}>{formatted}</Text>
                </View>
                <Text style={[styles.entryContent, { color: colors.text }]}>{entry.content}</Text>
                {entry.summary ? (
                  <View style={[styles.agentCard, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.agentTitle, { color: colors.text }]}>Analisis del agente</Text>
                    <Text style={[styles.agentSummary, { color: colors.text }]}>{entry.summary}</Text>
                    {entry.tips.map((tip) => (
                      <View key={tip} style={styles.tipRow}>
                        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                        <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={breathingVisible}
        transparent
        animationType="fade"
        onRequestClose={closeBreathing}
      >
        <View style={[styles.breatheOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.breatheCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
            <Text style={[styles.breatheTitle, { color: colors.text }]}>Respiración cuadrada</Text>
            <Text style={[styles.breatheSubtitle, { color: colors.subText }]}>Ciclo {Math.min(currentCycle, 4)} de 4</Text>
            <TouchableOpacity onPress={() => setSoundOn((v) => !v)} activeOpacity={0.8} style={[styles.soundToggle, { backgroundColor: colors.muted }]}>
              <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={18} color={colors.text} />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.breatheCircle,
                {
                  backgroundColor: colors.primary + '22',
                  transform: [
                    {
                      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }),
                    },
                  ],
                },
              ]}
            />

            <Text style={[styles.breathePhase, { color: colors.text }]}>{breathingPhase}</Text>
            {breathingPhase !== 'Completado' ? (
              <Text style={[styles.breatheTimer, { color: colors.subText }]}>{secondsLeft}s</Text>
            ) : (
              <Text style={[styles.breatheDone, { color: colors.primary }]}>¡Bien hecho!</Text>
            )}

            <View style={styles.breatheActions}>
              {breathingPhase === 'Completado' ? (
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.primary }]}
                  onPress={closeBreathing}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.closeButtonText, { color: colors.primaryContrast }]}>Finalizar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.muted }]}
                  onPress={closeBreathing}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>Detener</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 32,
    gap: 24,
    alignItems: 'stretch',
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  editorCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextBlock: {
    gap: 2,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 140,
    padding: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  entryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  entryContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  agentCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  agentTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  agentSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  breatheOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  breatheCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  breatheTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  breatheSubtitle: {
    fontSize: 13,
  },
  breatheCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginVertical: 8,
  },
  breathePhase: {
    fontSize: 20,
    fontWeight: '700',
  },
  breatheTimer: {
    fontSize: 14,
  },
  breatheDone: {
    fontSize: 14,
    fontWeight: '600',
  },
  breatheActions: {
    width: '100%',
    marginTop: 8,
  },
  closeButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  soundToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  breatheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  breatheButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
