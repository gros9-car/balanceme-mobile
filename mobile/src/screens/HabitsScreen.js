import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    summary: 'Tu rutina muestra intencion de movimiento y actividad fisica.',
    tips: [
      'Recuerda hidratarte y realizar estiramientos de recuperacion.',
      'Suma breves pausas de respiracion para equilibrar energia.',
    ],
  },
  descanso: {
    keywords: ['descans', 'dorm', 'siesta', 'relaj', 'sueÃƒÂ±o', 'acostar', 'despert'],
    summary: 'Estas priorizando el descanso, lo cual ayuda a tu balance.',
    tips: [
      'Mantener horarios constantes mejora la calidad del descanso.',
      'Describe como te sentiste al despertar para seguir midiendo tu energia.',
    ],
  },
  alimentacion: {
    keywords: ['comida', 'vegetal', 'fruta', 'nutric', 'cena', 'almuerzo', 'diet', 'agua', 'hidrata'],
    summary: 'Tu plan refleja conciencia sobre la alimentacion.',
    tips: [
      'Anota como te sientes despues de comer para identificar patrones.',
      'Acompaña tus comidas con pausas de respiracion para digerir mejor.',
    ],
  },
  mindfulness: {
    keywords: ['medit', 'respir', 'gratitud', 'diario', 'afirmacion', 'mindfulness', 'atencion plena', 'oracion'],
    summary: 'Está cultivando la presencia y el bienestar emocional.',
    tips: [
      'AÃƒÂ±ade tres respiraciones profundas antes de comenzar tus actividades clave.',
      'Registra una frase que resuma la calma que obtuviste.',
    ],
  },
  social: {
    keywords: ['familia', 'amiga', 'pareja', 'salir', 'convers', 'llam', 'compart'],
    summary: 'Incluiste momentos de conexion social en tu dia.',
    tips: [
      'Agradece el impacto positivo que esas interacciones generaron.',
      'Planifica el siguiente espacio de conexion para mantener la energia.',
    ],
  },
  trabajo: {
    keywords: ['trabajo', 'estudio', 'proyecto', 'tarea', 'objetivo', 'plan', 'reunion'],
    summary: 'Estas organizando tus responsabilidades con intencion.',
    tips: [
      'Reserva micro descansos para evitar la fatiga mental.',
      'Celebra el avance alcanzado por pequeÃƒÂ±o que parezca.',
    ],
  },
  autocuidado: {
    keywords: ['autocuidado', 'spa', 'rutina de piel', 'leer', 'series', 'hobby', 'creativ', 'arte'],
    summary: 'Tu plan contiene momentos de autocuidado y disfrute.',
    tips: [
      'Describe la sensacion que buscabas al darte ese espacio.',
      'Registra tres cosas que agradeces de ese momento personal.',
    ],
  },
};

const fallbackAgentResponse = {
  summary: 'Gracias por compartir tus habitos. Mantener registros te ayuda a ver tu progreso.',
  tips: [
    'Agrega detalles sobre como te sentiste antes y despues de cada habito.',
    'Incluye un micro-habito que puedas repetir mañana para sostener la racha.',
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
    ? `${baseSummary} Tambien resaltas acciones relacionadas con ${secondCategory}.`
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

  // Guarda la entrada del día y guarda el análisis generado automáticamente.
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sesion requerida', 'Inicia sesion para registrar tus habitos.');
      navigation?.replace?.('Login');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Contenido requerido', 'Describe al menos un habito para guardar.');
      return;
    }

    if (hasTodayEntry) {
      Alert.alert('Registro existente', 'Solo puedes registrar tus habitos una vez por dia.');
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
      Alert.alert('Habitos registrados', 'Tu entrada fue analizada y guardada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tus habitos. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
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
            <Text style={[styles.infoText, { color: colors.subText }]}>Ya registraste tus habitos del dia. MaÃƒÂ±ana tendremos nuevas sugerencias para ti.</Text>
          ) : (
            <Text style={[styles.infoText, { color: colors.subText }]}>Cuenta que acciones realizaste: movimiento, alimentacion, descanso, conexiones, etc.</Text>
          )}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Por ejemplo: CaminÃƒÂ© 20 minutos, practiquÃƒÂ© agradecimiento antes de cenar..."
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
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
