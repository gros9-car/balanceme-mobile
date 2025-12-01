import React from 'react';
import { StatusBar, ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

/**
 * Pantalla estática que muestra los términos y condiciones
 * de uso del servicio BalanceMe.
 */
const TermsAndConditionsScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={[styles.content]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <PageHeader
          title="Términos y condiciones"
          subtitle="Condiciones de uso de BalanceMe."
          rightContent={
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <Ionicons name="document-text-outline" size={28} color={colors.primaryContrast} />
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
            1. Aceptación
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Al utilizar BalanceMe, el usuario acepta las condiciones descritas en este
            documento.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Uso permitido
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            El usuario puede utilizar la aplicación para registrar información personal y
            acceder a las funcionalidades ofrecidas. Está prohibido manipular el sistema
            o intentar acceder a datos ajenos.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Cuentas de usuario
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            El usuario es responsable de mantener segura su contraseña. BalanceMe puede
            suspender cuentas cuando existan indicios claros de uso indebido, sin basarse
            en información de contraseñas ya que estas se almacenan en formato encriptado
            y no son visibles para el equipo de la aplicación.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. Contenido del usuario
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Todo contenido registrado pertenece al usuario. BalanceMe solo lo utiliza
            para funciones internas.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            5. Limitación de responsabilidad
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            BalanceMe no se hace responsable por fallos derivados de terceros, como
            servicios externos de alojamiento o conectividad.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            6. Finalización del servicio
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            El usuario puede eliminar su cuenta en cualquier momento. Al hacerlo, su
            información será removida permanentemente.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            7. Modificaciones
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Los Términos y Condiciones pueden cambiar para incorporar mejoras o nuevos
            servicios. Cualquier cambio relevante se comunicará dentro de la aplicación.
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
});

export default TermsAndConditionsScreen;
