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
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 32 }]}
          showsVerticalScrollIndicator={false}
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
              <Text style={[styles.subtitle, { color: colors.subText }]}>Tu espacio de bienestar</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
            <Text style={[styles.cardTitle, { color: colors.text }]}>Hola!</Text>
            <Text style={[styles.cardText, { color: colors.subText }]}>Este sera tu home. Aqui veras tu resumen diario, accesos rapidos y recomendaciones. Iremos mejorandolo poco a poco.</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={soon('Registrar estado de animo')}
              activeOpacity={0.9}
            >
              <Ionicons name="happy-outline" size={20} color={colors.primaryContrast} />
              <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Estado de animo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={soon('Habitos diarios')}
              activeOpacity={0.9}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primaryContrast} />
              <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Habitos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={soon('Meditaciones')}
              activeOpacity={0.9}
            >
              <Ionicons name="leaf-outline" size={20} color={colors.primaryContrast} />
              <Text style={[styles.quickActionText, { color: colors.primaryContrast }]}>Meditacion</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
            <Text style={[styles.cardTitle, { color: colors.text }]}>Sugerencias</Text>
            <Text style={[styles.cardText, { color: colors.subText }]}>- Toma 5 minutos para respirar profundamente.
- Anota algo por lo que estes agradecido hoy.
- Da un paseo corto si puedes.</Text>
          </View>
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
                <Text style={[styles.dropdownText, { color: colors.text }]}>Mi perfil</Text>
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
  },
  flex: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  brand: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
    paddingHorizontal: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
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
