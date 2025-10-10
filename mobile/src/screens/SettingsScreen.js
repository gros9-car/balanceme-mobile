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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderColor: colors.muted }]}> 
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Configuracion</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Configuracion</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>Personaliza BalanceMe para que coincida con tu estilo.</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
          <Text style={[styles.sectionHelper, { color: colors.subText }]}>Modo actual: {currentModeLabel}</Text>

          <ThemeOption
            mode="light"
            label="Modo claro"
            description="Iluminación suave ideal para espacios con buena luz."
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
            description="BalanceMe adoptará automáticamente el tema de tu dispositivo."
            isActive={theme === 'system'}
            onPress={handleThemeChange}
            colors={colors}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  topBarSpacer: {
    width: 60,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
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
