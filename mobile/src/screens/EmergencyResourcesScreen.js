import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

const CRISIS_STRATEGIES = [
  {
    id: 'grounding',
    title: 'Ejercicio 5-4-3-2-1',
    steps: [
      'Identifica 5 cosas que ves a tu alrededor.',
      'Reconoce 4 cosas que puedes tocar.',
      'Escucha 3 sonidos presentes.',
      'Percibe 2 olores o aromas.',
      'Detecta 1 sabor o sensación dentro de la boca.',
    ],
    purpose: 'Ayuda a volver al presente cuando la ansiedad o el pánico aparecen.',
  },
  {
    id: 'plan-seguridad',
    title: 'Plan de seguridad personal',
    steps: [
      'Nombra a una persona de confianza a la que puedas llamar de inmediato.',
      'Anota un lugar seguro al que puedas acudir.',
      'Define una actividad breve que sabes que te calma (música, ducha, paseo).',
      'Mantén a la mano los números de emergencia de tu localidad.',
    ],
    purpose: 'Provee una guía rápida cuando te sientas desbordado/a.',
  },
  {
    id: 'resp-reset',
    title: 'Reset en tres respiraciones',
    steps: [
      'Inhala lento por la nariz durante 4 segundos.',
      'Retén el aire contando 4 tiempos.',
      'Exhala por la boca durante 6 segundos.',
      'Al terminar, describe en voz baja cómo te sientes sin juzgarte.',
    ],
    purpose: 'Reduce la intensidad emocional para tomar decisiones más seguras.',
  },
];

const PROFESSIONAL_CONTACTS = [
  {
    id: 'linea-minsal',
    name: 'Linea Salud Mental MINSAL *4141',
    location: 'Cobertura nacional (desde celulares)',
    type: 'Prevencion del suicidio y crisis 24/7',
    action: { kind: 'phone', value: '*4141', label: 'Llamar *4141' },
  },
  {
    id: 'salud-responde',
    name: 'Salud Responde MINSAL',
    location: 'Cobertura nacional',
    type: 'Orientacion en salud y apoyo psicologico 24/7',
    action: { kind: 'phone', value: '6003607777', label: 'Llamar 600 360 7777' },
  },
  {
    id: 'emergencias-samu',
    name: 'Emergencias Medicas SAMU',
    location: 'Cobertura nacional',
    type: 'Servicios de emergencia medica general',
    action: { kind: 'phone', value: '131', label: 'Llamar 131' },
  },
  {
    id: 'emergencias-carabineros',
    name: 'Carabineros de Chile',
    location: 'Cobertura nacional',
    type: 'Emergencias de seguridad publica',
    action: { kind: 'phone', value: '133', label: 'Llamar 133' },
  },
  {
    id: 'linea-libre',
    name: 'Linea Libre Fono 1515 (INJUV)',
    location: 'Cobertura nacional',
    type: 'Apoyo psicologico para jovenes (lunes a sabado, 10:00 a 22:00 hrs)',
    action: { kind: 'phone', value: '1515', label: 'Llamar 1515' },
  },
  {
    id: 'quedate-cl',
    name: 'Programa quedate.cl',
    location: 'Red nacional (enfoque en Region Metropolitana)',
    type: 'Prevencion del suicidio y promocion de salud mental',
    action: { kind: 'web', value: 'https://www.quedate.cl', label: 'Abrir quedate.cl' },
  },
  {
    id: 'centros-salud',
    name: 'Centros de Salud Familiar (CESFAM)',
    location: 'Cobertura nacional',
    type: 'Atencion primaria y derivacion en salud mental (requiere inscripcion)',
    action: {
      kind: 'info',
      value: 'Acercate al CESFAM mas cercano o llama a tu municipio para obtener informacion de contacto.',
      label: 'Ver indicaciones',
    },
  },
];

const EmergencyResourcesScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const handleAction = async (contact) => {
    if (!contact?.action) {
      return;
    }

    if (contact.action.kind === 'phone') {
      const normalized = contact.action.value.replace(/\s+/g, '');
      const url = `tel:${normalized}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No disponible', 'No se pudo iniciar la llamada desde este dispositivo.');
      }
      return;
    }

    if (contact.action.kind === 'web') {
      const supported = await Linking.canOpenURL(contact.action.value);
      if (supported) {
        await Linking.openURL(contact.action.value);
      } else {
        Alert.alert('No disponible', 'No se pudo abrir el enlace en este dispositivo.');
      }
      return;
    }

    if (contact.action.kind === 'info') {
      Alert.alert(contact.name, contact.action.value);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.muted }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Recursos de emergencia</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Estrategias inmediatas y contactos profesionales disponibles cuando necesites apoyo urgente.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
          <Ionicons name="flash-outline" size={22} color={colors.primary} />
          <View style={styles.sectionText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Estrategias para crisis</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
              Practica estas guías cuando sientas que el estrés o el pánico se intensifican.
            </Text>
          </View>
        </View>

        {CRISIS_STRATEGIES.map((strategy) => (
          <View
            key={strategy.id}
            style={[styles.strategyCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
          >
            <View style={styles.strategyHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <View style={styles.strategyHeaderText}>
                <Text style={[styles.strategyTitle, { color: colors.text }]}>{strategy.title}</Text>
                <Text style={[styles.strategyPurpose, { color: colors.subText }]}>{strategy.purpose}</Text>
              </View>
            </View>
            {strategy.steps.map((step) => (
              <View key={step} style={styles.stepRow}>
                <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}>
          <Ionicons name="call-outline" size={22} color={colors.primary} />
          <View style={styles.sectionText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contactos profesionales</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
              Guarda estos números y actívalos cuando necesites ayuda especializada.
            </Text>
          </View>
        </View>

        {PROFESSIONAL_CONTACTS.map((contact) => (
          <View
            key={contact.id}
            style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.muted }]}
          >
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
              <Text style={[styles.contactType, { color: colors.subText }]}>{contact.type}</Text>
              <Text style={[styles.contactLocation, { color: colors.subText }]}>
                {`Ubicación: ${contact.location}`}
              </Text>
            </View>
            {contact.action ? (
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAction(contact)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={
                    contact.action.kind === 'web'
                      ? 'open-outline'
                      : contact.action.kind === 'info'
                        ? 'information-circle-outline'
                        : 'call'
                  }
                  size={16}
                  color={colors.primaryContrast}
                />
                <Text style={[styles.callText, { color: colors.primaryContrast }]}>
                  {contact.action.label}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmergencyResourcesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionText: {
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
  strategyCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  strategyHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  strategyHeaderText: {
    flex: 1,
    gap: 2,
  },
  strategyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  strategyPurpose: {
    fontSize: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  contactInfo: {
    gap: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactType: {
    fontSize: 13,
  },
  contactLocation: {
    fontSize: 12,
  },
  callButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  callText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
