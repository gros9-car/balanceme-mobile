import React from 'react';
import { StatusBar, ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const PrivacyPolicyScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { backgroundColor: 'transparent' },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <PageHeader
          title="Política de privacidad"
          subtitle="Cómo BalanceMe protege y utiliza tu información personal."
          rightContent={
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.primaryContrast} />
            </View>
          }
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.muted },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            1. Introducción
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            BalanceMe protege la información personal del usuario mediante prácticas
            seguras de almacenamiento y tratamiento de datos. Toda la información
            registrada en la app se almacena en Firebase bajo estándares modernos de
            seguridad.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Información que recopilamos
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Datos de autenticación (correo, contraseña)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Registros de estados de ánimo, metas e historial de hábitos
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Información técnica del dispositivo para mejorar el rendimiento
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Uso de la información
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            La información se utiliza exclusivamente para:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Registrar actividades del usuario
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Generar reportes
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Sincronizar datos entre dispositivos
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Mostrar métricas emocionales
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. Almacenamiento y seguridad
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Los datos se almacenan en Firestore con reglas de acceso basadas en
            autenticación. Ningún registro es compartido con terceros.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            5. Derechos del usuario
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            El usuario puede solicitar modificación o eliminación de sus datos
            enviando una solicitud a través de los mecanismos establecidos dentro
            de la app.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            6. Actualizaciones
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Esta política puede actualizarse para reflejar mejoras técnicas o
            cambios legales. Te notificaremos dentro de la app cuando se realicen
            cambios relevantes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 4,
    gap: 2,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PrivacyPolicyScreen;

