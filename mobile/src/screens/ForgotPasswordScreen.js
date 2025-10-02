import React, { useState, useRef } from 'react';
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

/**
 * Pantalla de recuperación de contraseña.
 * - Permite ingresar un correo y solicitar enlace de restablecimiento.
 * - Usa Firebase Auth (sendPasswordResetEmail).
 * - En web muestra Modal de éxito; en iOS/Android muestra Alert.
 */
export default function ForgotPasswordScreen({ navigation }) {
  // Estado del formulario: correo a recuperar
  const [email, setEmail] = useState('');
  // Estado de carga del botón
  const [isLoading, setIsLoading] = useState(false);
  // Control del Modal de éxito (solo web)
  const [successVisible, setSuccessVisible] = useState(false);
  // Errores de validación por campo
  const [errors, setErrors] = useState({});
  // Ref para poder quitar el foco antes de abrir el modal (evita warning aria-hidden en web)
  const emailInputRef = useRef(null);

  /**
   * Valida formato básico de correo electrónico.
   * @param {string} value
   * @returns {boolean}
   */
  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  /**
   * Maneja el envío del formulario de recuperación:
   * - Valida email requerido y formato.
   * - Envía correo de restablecimiento con Firebase.
   * - Notifica con Modal (web) o Alert (nativo) y ofrece volver a Login.
   */
  const handleReset = async () => {
    const emailTrim = email.trim();
    const newErrors = {};
    if (!emailTrim) newErrors.email = 'El correo es requerido';
    else if (!isValidEmail(emailTrim)) newErrors.email = 'Correo inválido';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, emailTrim);
      setIsLoading(false);

      if (Platform.OS === 'web') {
        try {
          emailInputRef.current?.blur?.();
          Keyboard.dismiss();
        } catch {}
        setTimeout(() => setSuccessVisible(true), 0);
        return;
      }

      Alert.alert(
        'Revisa tu correo',
        'Te enviamos un enlace para restablecer tu contraseña.',
        [{ text: 'Entendido', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setIsLoading(false);
      let msg = 'No pudimos enviar el correo. Intenta de nuevo.';
      if (err.code === 'auth/user-not-found') msg = 'No existe una cuenta con ese correo.';
      else if (err.code === 'auth/invalid-email') msg = 'Correo inválido.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con logo y subtítulo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>BalanceMe</Text>
          <Text style={styles.subtitle}>Recupera tu acceso</Text>
        </View>

        {/* Formulario: campo de email */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Restablecer contraseña</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                ref={emailInputRef}
                style={styles.textInput}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                }}
                placeholder="tu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Botón de envío */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleReset}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Enviando...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Enviar enlace</Text>
            )}
          </TouchableOpacity>

          {/* Enlace de retorno a Login */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>
              ¿Recordaste tu contraseña?{' '}
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>

        {/* Mensaje motivacional */}
        <Text style={styles.motivationalText}>
          "Cuidarte también es pedir ayuda a tiempo"
        </Text>
      </ScrollView>

      {/* Modal de éxito (Web): confirma envío y permite volver a Login */}
      <Modal
        transparent
        visible={successVisible}
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.modalTitle}>Correo enviado</Text>
            <Text style={styles.modalText}>Te enviamos un enlace para restablecer tu contraseña.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSuccessVisible(false);
                navigation.navigate('Login');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Ir a iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos coherentes con Register/Login
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 50,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  motivationalText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  // Estilos Modal (coherente con Register/Login)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

