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

// Normaliza una fecha al inicio del día para comparaciones consistentes.
const startOfDay = (value) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Convierte fechas a un string legible manejando posibles errores.
const formatDate = (date) => {
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

// Pantalla de diario personal que sincroniza entradas y permite registrar una nota diaria.
export default function JournalScreen({ navigation }) {
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
    // Escucha cambios en las últimas entradas para mostrar el diario actualizado.
    if (!user?.uid) {
      setEntries([]);
      setHasTodayEntry(false);
      setLoading(false);
      return undefined;
    }

    const journalRef = collection(db, 'users', user.uid, 'journal');
    const journalQuery = query(journalRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      journalQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          const timestamp = data.createdAt ?? data.createdAtServer;
          const createdAt = timestamp?.toDate ? timestamp.toDate() : new Date();
          const text = typeof data.content === 'string' ? data.content : '';
          return {
            id: docSnapshot.id,
            content: text,
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

  // Guarda una nueva entrada diaria validando sesión, contenido y límite de registros.
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sesión requerida', 'Inicia sesión para escribir en tu diario.');
      navigation?.replace?.('Login');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Contenido requerido', 'Escribe al menos una frase para guardar.');
      return;
    }

    if (hasTodayEntry) {
      Alert.alert('Registro existente', 'Solo puedes registrar una nota por día.');
      return;
    }

    setSaving(true);
    try {
      const journalRef = collection(db, 'users', user.uid, 'journal');
      await addDoc(journalRef, {
        content: trimmed,
        createdAt: serverTimestamp(),
      });
      setDraft('');
      Alert.alert('Listo', 'Tu nota fue guardada.');
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tu nota. Intenta nuevamente.');
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
          <Text style={[styles.centeredText, { color: colors.subText }]}>Inicia sesion para acceder a tu diario.</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Diario personal</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Anota tus pensamientos para seguir tu progreso.</Text>
        </View>

        <View style={[styles.editorCard, { backgroundColor: colors.surface, shadowColor: colors.outline }]}>
          <View style={styles.editorHeader}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.badgeTextBlock}>
              <Text style={[styles.badgeLabel, { color: colors.subText }]}>Entrada de hoy</Text>
              <Text style={[styles.badgeValue, { color: colors.text }]}>{todayLabel}</Text>
            </View>
          </View>
          {hasTodayEntry ? (
            <Text style={[styles.infoText, { color: colors.subText }]}>Ya registraste una nota hoy. Vuelve maÃ±ana para seguir documentando tu proceso.</Text>
          ) : (
            <Text style={[styles.infoText, { color: colors.subText }]}>Escribe lo que sientes, en que pensaste o algo que agradeces.</Text>
          )}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe aquí..."
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
              <Text style={[styles.saveButtonText, { color: colors.primaryContrast }]}>Guardar nota</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.timelineHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Entradas recientes</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>Cargando notas...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="book-outline" size={24} color={colors.subText} />
            <Text style={[styles.centeredText, { color: colors.subText }]}>Todavia no tienes notas guardadas.</Text>
          </View>
        ) : (
          entries.map((entry) => {
            const createdAt = entry.createdAt;
            const formatted = formatDate(createdAt);
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
              >
                <View style={styles.entryHeader}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={[styles.entryDate, { color: colors.subText }]}>{formatted}</Text>
                </View>
                <Text style={[styles.entryContent, { color: colors.text }]}>{entry.content}</Text>
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
    color: '#6b7280',
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
    gap: 8,
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
  centered: {
    alignItems: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
