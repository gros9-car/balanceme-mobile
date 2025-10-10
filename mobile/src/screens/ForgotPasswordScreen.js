import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';

import { auth } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

// Pantalla de recuperación que valida el correo y envía el enlace de restablecimiento.
export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const emailInputRef = useRef(null);

  // Revisa el correo y solicita a Firebase el envío del email de reinicio.
  const handleReset = async () => {
    const trimmed = email.trim();
    const nextErrors = {};

    if (!trimmed) {
      nextErrors.email = 'El correo es requerido';
    } else if (!/\S+@\S+\.\S+/.test(trimmed)) {
      nextErrors.email = 'Correo inválido';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);

      if (Platform.OS === 'web') {
        emailInputRef.current?.blur?.();
        Keyboard.dismiss();
        setSuccessVisible(true);
      } else {
        Alert.alert(
          'Revisa tu correo',
          'Te enviamos un enlace para restablecer tu contraseña.',
          [{ text: 'Entendido', onPress: () => navigation?.navigate?.('Login') }],
        );
      }
    } catch (error) {
      let message = 'No pudimos enviar el correo. Intenta de nuevo.';
      if (error.code === 'auth/user-not-found') {
        message = 'No existe una cuenta con ese correo.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Correo inválido.';
      }
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cierra el modal web y regresa a la pantalla de inicio de sesión.
  const closeModal = () => {
    setSuccessVisible(false);
    navigation?.navigate?.('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
          >
            <Ionicons name="heart" size={32} color={colors.primaryContrast} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>BalanceMe</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Recupera tu acceso</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
          <Text style={[styles.formTitle, { color: colors.text }]}>Restablecer contrasena</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Correo electronico</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.muted, borderColor: colors.muted },
                errors.email && { borderColor: colors.danger },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={colors.subText} style={styles.inputIcon} />
              <TextInput
                ref={emailInputRef}
                style={[styles.textInput, { color: colors.text }]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                placeholder="tu@email.com"
                placeholderTextColor={colors.subText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text> : null}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              isLoading && { backgroundColor: colors.muted, shadowOpacity: 0, elevation: 0 },
            ]}
            onPress={handleReset}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primaryContrast} />
                <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Enviando...</Text>
              </View>
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Enviar enlace</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation?.navigate?.('Login')}
          >
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
            <Text style={[styles.backToLoginText, { color: colors.accent }]}>Volver a iniciar sesion</Text>
          </TouchableOpacity>

          <Text style={[styles.motivationalText, { color: colors.subText }]}>Estamos contigo en cada paso.</Text>
        </View>
      </ScrollView>

      <Modal visible={successVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
            <Ionicons name="mail" size={40} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Correo enviado</Text>
            <Text style={[styles.modalText, { color: colors.subText }]}>Revisa tu bandeja y sigue las instrucciones para crear una nueva contrasena.</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={closeModal}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalButtonText, { color: colors.primaryContrast }]}>Ir a iniciar sesion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  motivationalText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
