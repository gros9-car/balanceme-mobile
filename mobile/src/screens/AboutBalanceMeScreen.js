import React from 'react';
import { StatusBar, ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const AboutBalanceMeScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <PageHeader
          title="¿Qué es BalanceMe?"
          subtitle="Conoce el propósito y la tecnología detrás de la app."
          rightContent={
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <Ionicons name="sparkles-outline" size={28} color={colors.primaryContrast} />
            </View>
          }
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.muted },
          ]}
        >
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            BalanceMe es una aplicación móvil diseñada para apoyar el bienestar emocional
            mediante el registro de estados de ánimo, metas personales, hábitos diarios
            y reflexiones. La app integra un sistema de seguimiento inteligente que
            permite visualizar patrones, detectar cambios emocionales y generar reportes
            semanales basados en el comportamiento del usuario.
          </Text>

          <Text style={[styles.paragraph, { color: colors.subText }]}>
            BalanceMe integra funciones que permiten sincronización de datos, 
            generación de reportes y asistencia mediante su agente virtual Balancito, 
            orientado a entregar respuestas inmediatas y contextualizadas, 
            sin exponer detalles técnicos internos de la plataforma.
          </Text>

          <Text style={[styles.paragraph, { color: colors.subText }]}>
            El propósito principal de BalanceMe es proporcionar un espacio seguro para
            llevar un control emocional y conductual, permitiendo al usuario comprender
            su propio progreso y tomar decisiones informadas para mejorar su bienestar.
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
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AboutBalanceMeScreen;

