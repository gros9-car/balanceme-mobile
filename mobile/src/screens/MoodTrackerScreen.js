import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { computeMoodAverages, moodScoreToLabel } from '../utils/moodAnalysis';

const COOL_DOWN_HOURS = 12;
const COOL_DOWN_MS = COOL_DOWN_HOURS * 60 * 60 * 1000;
const MAX_EMOJIS_PER_ENTRY = 3;

const fallbackSuggestions = [
  'Respira profundamente tres veces, con conciencia plena.',
  'Bebe un vaso de agua y haz una pausa breve.',
  'Escribe una breve nota sobre como te sientes.',
];

const emojiOptions = [
  { name: 'alegre', label: 'Alegre', codePoint: 0x1f600 },
  { name: 'agradecido', label: 'Agradecido', codePoint: 0x1f64f },
  { name: 'tranquilo', label: 'Tranquilo', codePoint: 0x1f60c },
  { name: 'motivado', label: 'Motivado', codePoint: 0x1f4aa },
  { name: 'energico', label: 'Energetico', codePoint: 0x26a1 },
  { name: 'estresado', label: 'Estresado', codePoint: 0x1f62b },
  { name: 'ansioso', label: 'Ansioso', codePoint: 0x1f630 },
  { name: 'cansado', label: 'Cansado', codePoint: 0x1f971 },
  { name: 'triste', label: 'Triste', codePoint: 0x1f622 },
  { name: 'enojado', label: 'Enojado', codePoint: 0x1f620 },
];

const emojiAgentProfiles = {
  alegre: { weights: { social: 2, energy: 1 } },
  agradecido: { weights: { reflection: 2, social: 1 } },
  tranquilo: { weights: { calm: 2, reflection: 1 } },
  motivado: { weights: { progress: 2, energy: 1 } },
  energico: { weights: { energy: 2, progress: 1 } },
  estresado: { weights: { calm: 2, release: 1 } },
  ansioso: { weights: { calm: 2, grounding: 2 } },
  cansado: { weights: { rest: 2, calm: 1 } },
  triste: { weights: { support: 2, reflection: 1 } },
  enojado: { weights: { release: 2, grounding: 1 } },
};

const agentStrategyLibrary = {
  social: [
    'Comparte un momento con alguien de confianza.',
    'Envíale un mensaje a una persona importante para agradecerle.',
    'Planifica una actividad ligera con amigos o familia.',
  ],
  energy: [
    'Realiza una rutina corta de movimiento o baile.',
    'Da una caminata breve para canalizar tu energía.',
    'Escucha música motivadora mientras ordenas tu espacio.',
  ],
  calm: [
    'Practica respiración caja: inhala 4s, sostiene 4s, exhala 4s.',
    'Haz una meditación guiada de 5 minutos enfocada en la respiración.',
    'Realiza estiramientos lentos enfocándote en hombros y cuello.',
  ],
  reflection: [
    'Escribe en tu diario tres ideas o aprendizajes del día.',
    'Enumera logros recientes y reconoce tu esfuerzo.',
    'Haz una lista de gratitud con al menos dos elementos.',
  ],
  progress: [
    'Define una micro-meta accionable para las próximas horas.',
    'Divide una tarea pendiente en pasos simples y completa el primero.',
    'Reserva 15 minutos para avanzar en un proyecto personal.',
  ],
  rest: [
    'Toma un descanso sin pantallas y bebe agua.',
    'Haz una siesta corta o practica relajación muscular progresiva.',
    'Prioriza acostarte 30 minutos antes esta noche.',
  ],
  support: [
    'Habla con alguien que pueda escucharte con empatía.',
    'Busca un espacio seguro para expresar como te sientes.',
    'Agenda un momento para actividades que te resulten reconfortantes.',
  ],
  release: [
    'Escribe tus pensamientos sin filtro durante 5 minutos.',
    'Haz ejercicio suave para liberar tensión acumulada.',
    'Practica respiraciones profundas contando hasta cuatro.',
  ],
  grounding: [
    'Usa la técnica 5-4-3-2-1 para anclarte al presente.',
    'Lava tu rostro con agua fría y respira lentamente.',
    'Observa conscientemente tu entorno durante un mínuto.',
  ],
};

const tagDescriptions = {
  social: 'Conectar con otras personas',
  energy: 'Canalizar tu energía',
  calm: 'Regalarte calma y regulación',
  reflection: 'Reflexionar con claridad',
  progress: 'Avanzar con tus metas',
  rest: 'Darle descanso a tu cuerpo',
  support: 'Buscar acompañamiento emocional',
  release: 'Liberar tensiones acumuladas',
  grounding: 'Anclarte al presente',
};

// Analiza la selección de emojis para decidir sugerencias y un resumen del estado.
const buildAgentResponse = (selectedNames) => {
  if (!selectedNames.length) {
    return { suggestions: [], summary: '' };
  }

  const scores = {};
  selectedNames.forEach((name) => {
    const profile = emojiAgentProfiles[name];
    if (!profile) {
      return;
    }
    Object.entries(profile.weights).forEach(([tag, weight]) => {
      scores[tag] = (scores[tag] ?? 0) + weight;
    });
  });

  const sortedTags = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  const suggestions = [];

  sortedTags.forEach((tag) => {
    const candidates = agentStrategyLibrary[tag];
    if (!candidates) {
      return;
    }
    candidates.forEach((tip) => {
      if (suggestions.length < 3 && !suggestions.includes(tip)) {
        suggestions.push(tip);
      }
    });
  });

  if (!suggestions.length) {
    return { suggestions: fallbackSuggestions.slice(0, 3), summary: '' };
  }

  if (suggestions.length < 3) {
    fallbackSuggestions.some((tip) => {
      if (!suggestions.includes(tip) && suggestions.length < 3) {
        suggestions.push(tip);
      }
      return suggestions.length >= 3;
    });
  }

  const dominantTag = sortedTags[0];
  const secondaryTag = sortedTags[1];
  let summary = '';
  if (dominantTag) {
    summary = `Tu selección muestra una necesidad de ${tagDescriptions[dominantTag] ?? 'equilibrio'}.`;
    if (secondaryTag) {
      summary += ` También aparecen señales de ${tagDescriptions[secondaryTag] ?? secondaryTag}.`;
    }
    summary += ' Estas sugerencias buscan cubrir esas áreas claves.';
  }

  return { suggestions: suggestions.slice(0, 3), summary };
};

// Pantalla para registrar el estado de ánimo y recibir recomendaciones personalizadas.
export default function MoodTrackerScreen({ navigation }) {
  const { colors } = useTheme();
  const { horizontalPadding, verticalPadding, maxContentWidth, safeTop, safeBottom } =
    useResponsiveLayout({ maxContentWidth: 920 });
  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );
  const [selectedEmojis, setSelectedEmojis] = useState([]);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [agentSummary, setAgentSummary] = useState('');
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {
    // Recupera el último registro para respetar el periodo de enfriamiento.
    if (!user?.uid) {
      setCooldownEndsAt(null);
      setLastSavedAt(null);
      setSuggestions([]);
      setAgentSummary('');
      return;
    }

    let isMounted = true;

    const fetchLatestMood = async () => {
      try {
        const moodsCollection = collection(db, 'users', user.uid, 'moods');
        const latestQuery = query(moodsCollection, orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(latestQuery);
        if (!isMounted) {
          return;
        }
        if (snapshot.empty) {
          setCooldownEndsAt(null);
          setLastSavedAt(null);
          setSuggestions([]);
          setAgentSummary('');
          return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const createdAtTimestamp = data?.createdAt ?? data?.createdAtServer;
        const createdAtDate = createdAtTimestamp?.toDate ? createdAtTimestamp.toDate() : null;
        if (createdAtDate) {
          const nextWindow = new Date(createdAtDate.getTime() + COOL_DOWN_MS);
          setCooldownEndsAt(nextWindow > new Date() ? nextWindow : null);
          setLastSavedAt(createdAtDate);
        }
        if (Array.isArray(data?.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 3));
        }
        if (typeof data?.agentSummary === 'string') {
          setAgentSummary(data.agentSummary);
        }
      } catch (error) {
        // Si falla, no bloqueamos la UI.
      }
    };

    fetchLatestMood();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Alterna la selección de emojis aplicando límites y validaciones.
  const toggleEmoji = (name) => {
    setSelectedEmojis((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }
      if (prev.length >= MAX_EMOJIS_PER_ENTRY) {
        Alert.alert('Maximo alcanzado', 'Puedes seleccionar hasta 3 emociones.');
        return prev;
      }
      return [...prev, name];
    });
  };

  const agentPreview = useMemo(() => buildAgentResponse(selectedEmojis), [selectedEmojis]);
  const previewSuggestions = agentPreview.suggestions;

  const now = new Date();
  const isOnCooldown = Boolean(cooldownEndsAt && cooldownEndsAt > now);
  const cooldownMessage = useMemo(() => {
    if (!cooldownEndsAt) {
      return '';
    }
    const diffMs = cooldownEndsAt.getTime() - Date.now();
    if (diffMs <= 0) {
      return '';
    }
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) {
      return `Podrás registrar un nuevo estado en ${minutes} min.`;
    }
    return `Podrás registrar un nuevo estado en ${hours} h ${minutes.toString().padStart(2, '0')} min.`;
  }, [cooldownEndsAt]);

  // Guarda el estado de ánimo y las sugerencias generadas en Firestore.
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para registrar tu estado de ánimo.');
      navigation?.replace?.('Login');
      return;
    }
    if (isOnCooldown) {
      Alert.alert('Espera un poco más', 'Sólo puedes registrar un estado cada 12 horas.');
      return;
    }
    if (!selectedEmojis.length) {
      Alert.alert('Selecciona emojis', 'Elige al menos un emoji para continuar.');
      return;
    }

    const agentResponse = agentPreview.suggestions.length ? agentPreview : buildAgentResponse(selectedEmojis);
    const entrySuggestions = agentResponse.suggestions.length ? agentResponse.suggestions : fallbackSuggestions.slice(0, 3);
    const entrySummary = agentResponse.summary;
    const createdAt = Timestamp.now();

    setSaving(true);
    try {
      const moodsCollection = collection(db, 'users', user.uid, 'moods');
      const score = computeMoodAverages(selectedEmojis);
      await addDoc(moodsCollection, {
        emojis: selectedEmojis,
        suggestions: entrySuggestions,
        agentSummary: entrySummary,
        scores: score,
        moodLabel: moodScoreToLabel(score),
        createdAt,
        createdAtServer: serverTimestamp(),
      });

      setSelectedEmojis([]);
      setSuggestions(entrySuggestions);
      setAgentSummary(entrySummary);
      setLastSavedAt(createdAt.toDate());
      const nextWindow = new Date(createdAt.toMillis() + COOL_DOWN_MS);
      setCooldownEndsAt(nextWindow);

      Alert.alert('Estado registrado', 'Tus emociones fueron guardadas correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tu estado. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || isOnCooldown;

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
          <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <Ionicons name="happy-outline" size={30} color={colors.primaryContrast} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Estado de animo</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>Elige hasta 3 emociones que describan como te sientes hoy.</Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Selecciona tus emojis</Text>
          <View style={styles.emojiGrid}>
            {emojiOptions.map((item) => {
              const isSelected = selectedEmojis.includes(item.name);
              const emojiChar = String.fromCodePoint(item.codePoint);
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.emojiButton,
                    { borderColor: colors.muted, backgroundColor: colors.muted },
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}
                  onPress={() => toggleEmoji(item.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emojiLabel}>{emojiChar}</Text>
                  <Text style={[styles.emojiText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.counterText, { color: colors.subText }]}>Seleccionados: {selectedEmojis.length} / 3</Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sugerencias destacadas</Text>
          {agentPreview.summary ? (
            <Text style={[styles.agentSummary, { color: colors.text }]}>{agentPreview.summary}</Text>
          ) : null}
          {previewSuggestions.length ? (
            previewSuggestions.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.subText }]}>{tip}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.tipPlaceholder, { color: colors.subText }]}>Selecciona al menos un emoji para ver sugerencias.</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            isSaveDisabled && { backgroundColor: colors.muted, shadowOpacity: 0, elevation: 0 },
          ]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          activeOpacity={0.9}
        >
          {saving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primaryContrast} />
              <Text style={[styles.submitText, { color: colors.primaryContrast }]}>Guardando...</Text>
            </View>
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryContrast }]}>Guardar estado</Text>
          )}
        </TouchableOpacity>

        {cooldownMessage ? (
          <Text style={[styles.cooldownText, { color: colors.danger }]}>{cooldownMessage}</Text>
        ) : null}
        {lastSavedAt ? (
          <Text style={[styles.cooldownText, { color: colors.subText }]}>Ultimo registro: {lastSavedAt.toLocaleString()}</Text>
        ) : null}

        {suggestions.length ? (
          <View
            style={[
              styles.card,
              styles.savedCard,
              { backgroundColor: colors.surface, borderColor: colors.muted },
            ]}
          >
            <Text style={[styles.savedTitle, { color: colors.text }]}>Ultimas sugerencias guardadas</Text>
            {agentSummary ? (
              <Text style={[styles.agentSummary, { color: colors.text }]}>{agentSummary}</Text>
            ) : null}
            {suggestions.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.subText }]}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}
        </View>
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
    alignItems: 'center',
  },
  content: {
    width: '100%',
    gap: 24,
  },
  header: {
    gap: 16,
  },
  backButton: {
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
  headerContent: {
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
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
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiButton: {
    width: '30%',
    minWidth: 96,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emojiLabel: {
    fontSize: 26,
  },
  emojiText: {
    fontSize: 13,
    fontWeight: '500',
  },
  counterText: {
    fontSize: 12,
    textAlign: 'right',
  },
  agentSummary: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tipPlaceholder: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  submitButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cooldownText: {
    fontSize: 12,
    textAlign: 'center',
  },
  savedCard: {
    borderWidth: 1,
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});





