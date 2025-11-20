import React, { useMemo, useState } from 'react';
import {
  StatusBar,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const BREATHING_EXERCISES = [
  {
    id: 'box',
    title: 'Respiración cuadrada',
    duration: '4 minutos',
    focus: 'Calma rápida y estabilidad',
    steps: [
      'Inhala por la nariz contando cuatro segundos.',
      'Mantiene el aire en los pulmones durante cuatro segundos.',
      'Exhala por la boca otros cuatro segundos.',
      'Permanece con los pulmones vacíos por cuatro segundos y repite el ciclo.',
    ],
  },
  {
    id: '478',
    title: 'Respiración 4-7-8',
    duration: '3 minutos',
    focus: 'Preparación para el descanso',
    steps: [
      'Coloca la lengua detras de los dientes superiores.',
      'Inhala por la nariz contando cuatro segundos.',
      'Sostiene el aire durante siete segundos.',
      'Exhala suavemente por la boca en ocho segundos y repite.',
    ],
  },
  {
    id: 'coherence',
    title: 'Respiración coherente',
    duration: '5 minutos',
    focus: 'Ritmo cardíaco equilibrado',
    steps: [
      'Inhala por la nariz durante cinco segundos.',
      'Exhala por la boca durante cinco segundos.',
      'Mantiene el ritmo continuo durante veinte ciclos.',
    ],
  },
  {
    id: 'alternate',
    title: 'Respiración alternada',
    duration: '6 minutos',
    focus: 'Claridad y enfoque mental',
    steps: [
      'Cierra la fosa nasal derecha con el pulgar e inhala por la izquierda durante cuatro segundos.',
      'Cierra la izquierda con el anular y exhala por la derecha durante cuatro segundos.',
      'Inhala por la derecha y exhala por la izquierda. Continua alternando sin prisa.',
    ],
  },
  {
    id: 'diaphragmatic',
    title: 'Respiración diafragmática',
    duration: '7 minutos',
    focus: 'Liberar tensión corporal',
    steps: [
      'Coloca una mano en el pecho y otra sobre el abdomen.',
      'Inhala por la nariz inflando el abdomen y manteniendo el pecho relajado.',
      'Exhala por la boca contrayendo suavemente el abdomen.',
      'Permanece atenta a la sensacion de calma mientras repites el ciclo.',
    ],
  },
];

const MEDITATIONS = [
  {
    id: 'meditation-5',
    title: 'Meditación guiada breve',
    duration: '5 minutos',
    summary: 'Enfoca tu atención en la respiración y regresa cuando la mente divague.',
    description:
      'Busca una postura cómoda, cierra los ojos y sigue el ritmo de la respiración. Cuando aparezca un pensamiento, reconócelo y vuelve a la respiración sin juicio.',
  },
  {
    id: 'meditation-10',
    title: 'Meditación de compasión',
    duration: '10 minutos',
    summary: 'Cultiva amabilidad contigo misma y luego hacia otras personas.',
    description:
      'Inicia deseándote bienestar: “Que esté en paz, que esté a salvo, que esté en equilibrio”. Luego extiende el mismo deseo a personas cercanas y finalmente a toda la comunidad.',
  },
  {
    id: 'meditation-15',
    title: 'Escaneo corporal consciente',
    duration: '15 minutos',
    summary: 'Explora sensaciones fisicas para relajar y reconocer emociones acumuladas.',
    description:
      'Recorre mentalmente el cuerpo desde los pies hasta la cabeza. Observa sensaciones, tensiones y temperatura, inhalando para suavizar y exhalando para soltar.',
  },
];

const RELAXATION_TECHNIQUES = [
  {
    id: 'pmr-seated',
    title: 'Relajación progresiva sentada',
    duration: '8 minutos',
    summary: 'Practica gradualmente desde los pies hasta el rostro para soltar tensión.',
    steps: [
      'Siéntate con la espalda recta y los pies firmes en el suelo.',
      'Tensa los músculos de los pies durante cinco segundos y libera de golpe.',
      'Continua con pantorrillas, muslos, abdomen, manos, brazos y rostro.',
      'Respira profundo entre cada zona para notar la diferencia.',
    ],
  },
  {
    id: 'pmr-lying',
    title: 'Relajación progresiva acostada',
    duration: '12 minutos',
    summary: 'Ideal antes de dormir o posterior a una jornada demandante.',
    steps: [
      'Acuéstate boca arriba con los brazos a los costados y las palmas hacia arriba.',
      'Tensa cada grupo muscular al inhalar y suéltalo al exhalar, avanzando desde los pies hasta la cabeza.',
      'Permanece dos minutos en silencio prestando atencion al ritmo de tu respiracion.',
    ],
  },
];

const BreathingCard = ({
  exercise,
  colors,
  isActive,
  currentStep,
  onStart,
  onNext,
  stepIndex,
}) => (
  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderText}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{exercise.title}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.subText }]}>
          {exercise.duration} · {exercise.focus}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={onStart}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isActive ? 'close' : 'play'}
          size={16}
          color={colors.primaryContrast}
        />
        <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
          {isActive ? 'Cerrar guia' : 'Iniciar guia'}
        </Text>
      </TouchableOpacity>
    </View>

    {isActive ? (
      <View style={[styles.stepBox, { borderColor: colors.primary + '55' }]}>
        <Text style={[styles.stepLabel, { color: colors.primary }]}>
          Paso {stepIndex + 1} de {exercise.steps.length}
        </Text>
        <Text style={[styles.stepText, { color: colors.text }]}>{currentStep}</Text>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            {stepIndex + 1 >= exercise.steps.length ? 'Finalizar' : 'Siguiente paso'}
          </Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </View>
);

const ExpandableCard = ({ title, subtitle, children, colors }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.cardSubtitle, { color: colors.subText }]}>{subtitle}</Text>
          ) : null}
        </View>

        {/* 🔥 Caja uniforme para las flechas */}
        <View style={styles.chevronBox}>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.subText}
          />
        </View>
      </TouchableOpacity>

      {open ? <View style={styles.cardBody}>{children}</View> : null}
    </View>
  );
};

const SelfCareLibraryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [activeExercise, setActiveExercise] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.05));
  const maxContentWidth = Math.min(900, width * 0.95);

  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: horizontalPadding,
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      width: '100%',
    }),
    [horizontalPadding, maxContentWidth],
  );

  const currentExercise = useMemo(
    () => BREATHING_EXERCISES.find((item) => item.id === activeExercise) ?? null,
    [activeExercise],
  );

  const currentStep = currentExercise ? currentExercise.steps[stepIndex] : null;

  const handleStart = (exerciseId) => {
    if (activeExercise === exerciseId) {
      setActiveExercise(null);
      setStepIndex(0);
      return;
    }
    setActiveExercise(exerciseId);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (!currentExercise) return;
    if (stepIndex + 1 >= currentExercise.steps.length) {
      setActiveExercise(null);
      setStepIndex(0);
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={{ paddingHorizontal: horizontalPadding, paddingVertical: 16 }}>
        <PageHeader
          title="Biblioteca de autocuidado"
          subtitle="Encuentra ejercicios prácticos para calmar tu mente y cuerpo."
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        {/* --- Sección respiración --- */}
        <View style={[styles.sectionIntro, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
          <Ionicons name="leaf-outline" size={22} color={colors.primary} />
          <View style={styles.sectionIntroText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Respiracion guiada</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
              Cinco ejercicios seleccionados para regular tu sistema nervioso sin necesidad de conexión.
            </Text>
          </View>
        </View>

        {BREATHING_EXERCISES.map((exercise) => (
          <BreathingCard
            key={exercise.id}
            exercise={exercise}
            colors={colors}
            isActive={currentExercise?.id === exercise.id}
            currentStep={currentExercise?.id === exercise.id ? currentStep : null}
            onStart={() => handleStart(exercise.id)}
            onNext={handleNext}
            stepIndex={currentExercise?.id === exercise.id ? stepIndex : 0}
          />
        ))}

        {/* --- Sección meditaciones --- */}
        <View style={[styles.sectionIntro, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          <View style={styles.sectionIntroText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Meditaciones</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
              Tres sesiones guiadas para distintos momentos del dia. Descarga el contenido una vez y practicamente offline.
            </Text>
          </View>
        </View>

        {MEDITATIONS.map((item) => (
          <ExpandableCard
            key={item.id}
            title={`${item.title} · ${item.duration}`}
            subtitle={item.summary}
            colors={colors}
          >
            <Text style={[styles.listText, { color: colors.text }]}>{item.description}</Text>
          </ExpandableCard>
        ))}

        {/* --- Sección relajación progresiva --- */}
        <View style={[styles.sectionIntro, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
          <Ionicons name="body-outline" size={22} color={colors.primary} />
          <View style={styles.sectionIntroText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Relajacion progresiva</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
              Dos rutinas sin audio para liberar tension muscular en cualquier espacio.
            </Text>
          </View>
        </View>

        {RELAXATION_TECHNIQUES.map((item) => (
          <ExpandableCard
            key={item.id}
            title={`${item.title} · ${item.duration}`}
            subtitle={item.summary}
            colors={colors}
          >
            {item.steps.map((step) => (
              <View key={step} style={styles.listRow}>
                <Ionicons name="ellipse-outline" size={12} color={colors.primary} />
                <Text style={[styles.listText, { color: colors.text }]}>{step}</Text>
              </View>
            ))}
          </ExpandableCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SelfCareLibraryScreen;

/* -------------------------------- */
/* ----------- ESTILOS ------------ */
/* -------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },

  sectionIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionIntroText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  /* 🔥 Caja uniforme para flechas */
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardBody: {
    gap: 10,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  stepBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
