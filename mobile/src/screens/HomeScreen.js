import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

import { auth } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

const metricSummary = [
  { label: 'Habitos completados', value: '3/5' },
  { label: 'Minutos de calma', value: '12' },
  { label: 'Vasos de agua', value: '6' },
];

const dailySuggestions = [
  'Toma 5 minutos para respirar profundamente.',
  'Anota algo por lo que estes agradecido hoy.',
  'Da un paseo corto si puedes.',
];

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = () => setMenuVisible(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      closeMenu();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'No pudimos cerrar sesion. Intenta de nuevo.');
    }
  };

  const soon = (feature) => () => Alert.alert('Proximamente', feature);

  const goTo = (screen) => {
    closeMenu();
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.menuButton,
                styles.menuFloating,
                { borderColor: colors.muted, backgroundColor: colors.surface },
              ]}
              onPress={() => setMenuVisible((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Ionicons name={menuVisible ? 'close' : 'menu'} size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.brand}>
              <View
                style={[
                  styles.logoContainer,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
              >
                <Ionicons name="heart" size={32} color={colors.primaryContrast} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>BalanceMe</Text>
              <Text style={[styles.subtitle, { color: colors.subText }]}>Tu punto de equilibrio diario</Text>
            </View>
          </View>

          <View
            style={[
              styles.formContainer,
              { backgroundColor: colors.surface, shadowColor: colors.outline },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>Tu dia en balance</Text>
            <Text style={[styles.infoText, { color: colors.subText }]}>Revisa tu progreso y accede rapidamente a las acciones mas importantes.</Text>

            <View style={styles.metricsRow}>
              {metricSummary.map((metric) => (
                <View
                  key={metric.label}
                  style={[
                    styles.metricCard,
                    { backgroundColor: colors.muted, borderColor: colors.muted },
                  ]}
                >
                  <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, { color: colors.subText }]}>{metric.label}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.text }]}>Accesos rapidos</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={() => goTo('Mood')}
                activeOpacity={0.85}
              >
                <Ionicons name="happy-outline" size={18} color={colors.primaryContrast} />
                <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Estado de animo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={() => goTo('Settings')}
                activeOpacity={0.85}
              >
                <Ionicons name="options-outline" size={18} color={colors.primaryContrast} />
                <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Ajustes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={() => goTo('Profile')}
                activeOpacity={0.85}
              >
                <Ionicons name="person-circle-outline" size={18} color={colors.primaryContrast} />
                <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Perfil</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, shadowColor: colors.outline },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sugerencias para hoy</Text>
            {dailySuggestions.map((item) => (
              <View key={item} style={styles.suggestionRow}>
                <View
                  style={[styles.bullet, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                />
                <Text style={[styles.suggestionText, { color: colors.subText }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.motivationalText, { color: colors.subText }]}>"Pequenos pasos diarios hacen grandes cambios"</Text>
        </ScrollView>

        {menuVisible && (
          <>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeMenu} />
            <View
              style={[
                styles.dropdown,
                { backgroundColor: colors.surface, borderColor: colors.muted, shadowColor: colors.outline },
              ]}
            >
              <TouchableOpacity style={styles.dropdownItem} onPress={() => goTo('Profile')} activeOpacity={0.8}>
                <Ionicons name="person-circle-outline" size={18} color={colors.text} />
                <Text style={[styles.dropdownText, { color: colors.text }]}>Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => goTo('Settings')} activeOpacity={0.8}>
                <Ionicons name="settings-outline" size={18} color={colors.text} />
                <Text style={[styles.dropdownText, { color: colors.text }]}>Configuracion</Text>
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.muted }]} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={[styles.dropdownText, { color: colors.danger }]}>Cerrar sesion</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    gap: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  motivationalText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuFloating: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 68,
    left: 20,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
