import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOOD_EMOJIS = [
  { name: 'alegre', label: 'Alegre' },
  { name: 'agradecido', label: 'Agradecido' },
  { name: 'tranquilo', label: 'Tranquilo' },
  { name: 'motivado', label: 'Motivado' },
  { name: 'energico', label: 'Energetico' },
  { name: 'estresado', label: 'Estresado' },
  { name: 'ansioso', label: 'Ansioso' },
  { name: 'cansado', label: 'Cansado' },
  { name: 'triste', label: 'Triste' },
  { name: 'enojado', label: 'Enojado' },
];

const HABIT_CATEGORIES = [
  { value: 'movimiento', label: 'Movimiento' },
  { value: 'descanso', label: 'Descanso' },
  { value: 'alimentacion', label: 'Alimentacion' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'social', label: 'Conexion social' },
  { value: 'trabajo', label: 'Foco y trabajo' },
  { value: 'autocuidado', label: 'Autocuidado' },
];

const CATEGORY_OPTIONS = [
  { value: 'mood', label: 'Estado de animo', icon: 'happy-outline' },
  { value: 'habit', label: 'Habitos', icon: 'leaf-outline' },
  { value: 'custom', label: 'Personalizada', icon: 'sparkles-outline' },
];

const COMPARISON_OPTIONS = [
  { value: 'atLeast', label: 'Al menos' },
  { value: 'atMost', label: 'Como maximo' },
];

const defaultGoal = {
  title: '',
  category: 'mood',
  metricType: 'avgMood',
  comparison: 'atLeast',
  targetValue: 1.5,
  filters: {},
  description: '',
  measurementLabel: '',
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const GoalFormModal = ({ visible, onClose, onSubmit, initialGoal }) => {
  const base = initialGoal ?? defaultGoal;

  const [title, setTitle] = useState(base.title ?? '');
  const [category, setCategory] = useState(base.category ?? 'mood');
  const [metricType, setMetricType] = useState(base.metricType ?? 'avgMood');
  const [comparison, setComparison] = useState(base.comparison ?? 'atLeast');
  const [targetValue, setTargetValue] = useState(String(base.targetValue ?? 0));
  const [description, setDescription] = useState(base.description ?? '');
  const [filters, setFilters] = useState(base.filters ?? {});
  const [error, setError] = useState('');
  const [measurementLabel, setMeasurementLabel] = useState(base.measurementLabel ?? '');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const nextBase = initialGoal ?? defaultGoal;
    setTitle(nextBase.title ?? '');
    setCategory(nextBase.category ?? 'mood');
    setMetricType(nextBase.metricType ?? (nextBase.category === 'mood' ? 'avgMood' : 'frequency'));
    setComparison(nextBase.comparison ?? 'atLeast');
    setTargetValue(String(nextBase.targetValue ?? 0));
    setDescription(nextBase.description ?? '');
    setFilters(nextBase.filters ?? {});
    setError('');
    setMeasurementLabel(nextBase.measurementLabel ?? '');
  }, [visible, initialGoal]);

  const targetHelper = useMemo(() => {
    if (category === 'mood' && metricType === 'avgMood') {
      return 'Puntaje promedio de valencia (-2 a 2).';
    }
    if (category === 'mood' && metricType === 'frequency') {
      return 'Cantidad de registros de animo que deseas lograr por semana.';
    }
    if (category === 'habit') {
      return 'Numero de registros de habitos que coinciden con los filtros.';
    }
    if (category === 'custom') {
      return 'Numero de actividades registradas esta semana.';
    }
    return '';
  }, [category, metricType]);

  const toggleFilterValue = (filterKey, value) => {
    setFilters((prev) => {
      const nextSet = new Set(Array.isArray(prev?.[filterKey]) ? prev[filterKey] : []);
      if (nextSet.has(value)) {
        nextSet.delete(value);
      } else {
        nextSet.add(value);
      }
      return {
        ...prev,
        [filterKey]: Array.from(nextSet),
      };
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Define un nombre para la meta.');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      metricType,
      comparison,
      targetValue: toNumber(targetValue, 0),
      filters,
      description: description.trim(),
      measurementLabel: measurementLabel.trim(),
    };

    onSubmit?.(payload);
  };

  const availableComparison = COMPARISON_OPTIONS;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialGoal ? 'Editar meta' : 'Nueva meta'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.form}
            contentContainerStyle={{ paddingBottom: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ejemplo: Mantener animo positivo"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.choiceRow}>
                {CATEGORY_OPTIONS.map((option) => {
                  const active = category === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.choiceButton, active && styles.choiceButtonActive]}
                      onPress={() => {
                        setCategory(option.value);
                        setFilters({});
                        if (option.value === 'mood') {
                          setMetricType('avgMood');
                        } else {
                          setMetricType('frequency');
                        }
                        if (!initialGoal) {
                          setMeasurementLabel(
                            option.value === 'mood'
                              ? 'puntos'
                              : option.value === 'habit'
                                ? 'registros'
                                : 'acciones',
                          );
                        }
                      }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={active ? '#ffffff' : '#4b5563'}
                      />
                      <Text
                        style={[
                          styles.choiceLabel,
                          active ? styles.choiceLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {category === 'mood' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Emociones a monitorear</Text>
                <View style={styles.tagGrid}>
                  {MOOD_EMOJIS.map((emoji) => {
                    const selected = (filters.emojis ?? []).includes(emoji.name);
                    return (
                      <TouchableOpacity
                        key={emoji.name}
                        style={[styles.tag, selected && styles.tagActive]}
                        onPress={() => toggleFilterValue('emojis', emoji.name)}
                      >
                        <Text style={[styles.tagLabel, selected && styles.tagLabelActive]}>
                          {emoji.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {category === 'habit' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Categorias de habitos</Text>
                <View style={styles.tagGrid}>
                  {HABIT_CATEGORIES.map((option) => {
                    const selected = (filters.categories ?? []).includes(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.tag, selected && styles.tagActive]}
                        onPress={() => toggleFilterValue('categories', option.value)}
                      >
                        <Text style={[styles.tagLabel, selected && styles.tagLabelActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {category === 'mood' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Como mediremos esta meta</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity
                    style={[styles.choiceButton, metricType === 'avgMood' && styles.choiceButtonActive]}
                    onPress={() => setMetricType('avgMood')}
                  >
                    <Text
                      style={[
                        styles.choiceLabel,
                        metricType === 'avgMood' && styles.choiceLabelActive,
                      ]}
                    >
                      Promedio de animo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceButton, metricType === 'frequency' && styles.choiceButtonActive]}
                    onPress={() => setMetricType('frequency')}
                  >
                    <Text
                      style={[
                        styles.choiceLabel,
                        metricType === 'frequency' && styles.choiceLabelActive,
                      ]}
                    >
                      Numero de registros
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Condicion de exito</Text>
              <View style={styles.choiceRow}>
                {availableComparison.map((option) => {
                  const active = comparison === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.choiceButton, active && styles.choiceButtonActive]}
                      onPress={() => setComparison(option.value)}
                    >
                      <Text
                        style={[
                          styles.choiceLabel,
                          active ? styles.choiceLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Objetivo semanal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetValue}
                onChangeText={setTargetValue}
              />
              {targetHelper ? <Text style={styles.helper}>{targetHelper}</Text> : null}
              {category !== 'mood' || metricType !== 'avgMood' ? (
                <View style={styles.quickTargets}>
                  {[1, 3, 5, 7].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.quickTargetButton,
                        Number(targetValue) === value && styles.quickTargetActive,
                      ]}
                      onPress={() => setTargetValue(String(value))}
                    >
                      <Text
                        style={[
                          styles.quickTargetLabel,
                          Number(targetValue) === value && styles.quickTargetLabelActive,
                        ]}
                      >
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Etiqueta para la medicion</Text>
              <TextInput
                style={styles.input}
                value={measurementLabel}
                onChangeText={setMeasurementLabel}
                placeholder={
                  category === 'mood'
                    ? 'Ej. puntos de animo'
                    : category === 'habit'
                      ? 'Ej. registros, veces'
                      : 'Ej. sesiones, minutos'
                }
              />
              <Text style={styles.helper}>
                Se usara para mostrar el progreso (por ejemplo "3 sesiones de 5").
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descripcion (opcional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Notas, motivaciones o definicion de exito."
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitLabel}>{initialGoal ? 'Guardar cambios' : 'Crear meta'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    maxHeight: 540,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  choiceLabel: {
    fontSize: 13,
    color: '#374151',
  },
  choiceLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf6',
  },
  tagLabel: {
    fontSize: 12,
    color: '#374151',
  },
  tagLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickTargets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickTargetButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickTargetActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  quickTargetLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  quickTargetLabelActive: {
    color: '#ffffff',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
