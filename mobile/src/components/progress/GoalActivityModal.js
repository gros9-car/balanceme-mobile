import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';

const toNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const GoalActivityModal = ({ visible, onClose, onSubmit, goal }) => {
  const [value, setValue] = useState('1');
  const [note, setNote] = useState('');
  const measurementLabel =
    goal?.measurementLabel || (goal?.category === 'custom' ? 'acciones' : 'registros');

  useEffect(() => {
    if (!visible) {
      return;
    }
    setValue('1');
    setNote('');
  }, [visible]);

  const handleSave = () => {
    onSubmit?.({
      goalId: goal?.id,
      value: toNumber(value, 1),
      note: note.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Registrar avance</Text>
          <Text style={styles.subtitle}>
            {goal?.title ?? 'Meta personalizada'} · suma {measurementLabel} realizadas.
          </Text>

          <Text style={styles.label}>
            Cantidad ({measurementLabel})
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />

          <Text style={styles.label}>Nota (opcional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={note}
            onChangeText={setNote}
            placeholder={`Ejemplo: ${measurementLabel} realizada, detalle opcional.`}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleSave}>
              <Text style={styles.primaryText}>Guardar</Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  primary: {
    backgroundColor: '#8b5cf6',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
