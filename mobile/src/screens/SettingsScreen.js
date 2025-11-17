import React, { useMemo } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

// Tarjeta de selección que permite elegir el modo de color deseado.
const ThemeOption = ({ mode, label, description, isActive, onPress, colors }) => {
  const borderColor = isActive ? colors.accent : colors.muted;
  const backgroundColor = isActive ? colors.accent : colors.surface;
  const textColor = isActive ? colors.primaryContrast : colors.text;
  const iconColor = isActive ? colors.primaryContrast : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(mode)}
      style={[styles.option, { borderColor, backgroundColor }]}
    >
      <View style={styles.optionHeader}>
        <Ionicons
          name={mode === 'system' ? 'phone-portrait-outline' : mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
          size={22}
          color={iconColor}
        />
        <Text style={[styles.optionTitle, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={[styles.optionDescription, { color: isActive ? colors.primaryContrast : colors.subText }]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
};

// Pantalla de ajustes enfocada en cambiar el tema de la aplicación.
export default function SettingsScreen({ navigation }) {
  const { colors, theme, setTheme, effectiveTheme } = useTheme();
  const { horizontalPadding, verticalPadding, maxContentWidth, safeTop, safeBottom } =
    useResponsiveLayout({ maxContentWidth: 640 });
  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  // Genera una etiqueta amigable del modo actual de tema.
  const currentModeLabel = useMemo(() => {
    if (theme === 'system') {
      return effectiveTheme === 'dark' ? 'Sistema (oscuro)' : 'Sistema (claro)';
    }
    return theme === 'dark' ? 'Oscuro' : 'Claro';
  }, [theme, effectiveTheme]);

  // Actualiza la preferencia de tema elegida por el usuario.
  const handleThemeChange = (mode) => {
    setTheme(mode);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: safeBottom },
      ]}
    >
      <StatusBar barStyle={colors.statusBarStyle} />
      <View
        style={[
          styles.topBarWrapper,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: Math.max(12, verticalPadding * 0.4),
          },
        ]}
      >
        <View style={contentWidthStyle}>
          <PageHeader
            title="Configuración"
            subtitle="Personaliza BalanceMe para que coincida con tu estilo."
          />
        </View>
      </View>
      <View
        style={[
          styles.contentWrapper,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: verticalPadding,
            paddingTop: verticalPadding,
          },
        ]}
      >
        <View style={[styles.content, contentWidthStyle]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
            <Text style={[styles.sectionHelper, { color: colors.subText }]}>
              Modo actual: {currentModeLabel}
            </Text>

            <ThemeOption
              mode="light"
              label="Modo claro"
              description="Iluminacion suave ideal para espacios con buena luz."
              isActive={theme === 'light'}
              onPress={handleThemeChange}
              colors={colors}
            />
            <ThemeOption
              mode="dark"
              label="Modo oscuro"
              description="Contraste alto para cuidar tu vista en ambientes nocturnos."
              isActive={theme === 'dark'}
              onPress={handleThemeChange}
              colors={colors}
            />
            <ThemeOption
              mode="system"
              label="Seguir al sistema"
              description="BalanceMe adaptara automaticamente el tema de tu dispositivo."
              isActive={theme === 'system'}
              onPress={handleThemeChange}
              colors={colors}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarWrapper: {
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
  },
  content: {
    width: '100%',
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHelper: {
    fontSize: 13,
  },
  option: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
