import React, { useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import PageHeader from '../components/PageHeader';
import { validatePasswordPolicy, passwordPolicySummary } from '../utils/passwordPolicy';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

/**
 * Pantalla de registro de nuevos usuarios.
 * Crea cuentas en Firebase Auth y guarda el perfil básico en Firestore.
 */
export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    keyboardVerticalOffset,
    safeTop,
    safeBottom,
  } = useResponsiveLayout({
    horizontalFactor: 0.08,
    verticalFactor: 0.06,
    maxContentWidth: 520,
  });

  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Valida nombre, correo y contraseñas usando la nueva política.
  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 5) {
      nextErrors.name = 'El nombre debe tener al menos 5 caracteres';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'El correo es requerido';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      nextErrors.email = 'Correo inválido';
    }

    const password = formData.password ?? '';
    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.confirmPassword !== password) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password,
      );

      await updateProfile(credential.user, { displayName: formData.name.trim() });

      await setDoc(doc(db, 'users', credential.user.uid), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        createdAt: new Date(),
      });

      if (Platform.OS === 'web') {
        setSuccessVisible(true);
      } else {
        Alert.alert('Bienvenid@ a BalanceMe', 'Tu cuenta está lista.', [
          {
            text: 'Continuar',
            onPress: () => {
              navigation?.navigate?.('Home');
            },
          },
        ]);
      }
    } catch (error) {
      let message = 'No pudimos crear tu cuenta. Intenta nuevamente.';

      if (error.code === 'auth/email-already-in-use') {
        message = 'El correo ingresado ya está registrado.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Correo inválido.';
      } else if (error.code === 'auth/weak-password') {
        message = 'La contraseña es muy débil.';
      }

      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessVisible(false);
    navigation?.navigate?.('Login');
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop,
          paddingBottom: safeBottom,
        },
      ]}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: verticalPadding,
              paddingBottom: verticalPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, contentWidthStyle]}>
            <PageHeader
              title="BalanceMe"
              subtitle="Crea tu cuenta para empezar tu camino de bienestar."
              rightContent={
                <View
                  style={[
                    styles.logoContainer,
                    { backgroundColor: colors.primary, shadowColor: colors.primary },
                  ]}
                >
                  <Ionicons name="heart" size={32} color={colors.primaryContrast} />
                </View>
              }
            />

            <View
              style={[
                styles.formContainer,
                { backgroundColor: colors.surface, shadowColor: colors.outline },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.text }]}>Crear cuenta</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nombre</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.muted, borderColor: colors.muted },
                    errors.name && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.subText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.subText}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Correo electrónico</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.muted, borderColor: colors.muted },
                    errors.email && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.subText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    placeholder="tu@email.com"
                    placeholderTextColor={colors.subText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.muted, borderColor: colors.muted },
                    errors.password && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.subText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={colors.subText}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.subText}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.password}
                  </Text>
                ) : (
                  <Text style={[styles.helperText, { color: colors.subText }]}>
                    {passwordPolicySummary}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Confirmar contraseña</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.muted, borderColor: colors.muted },
                    errors.confirmPassword && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={colors.subText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={colors.subText}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.subText}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.confirmPassword}
                  </Text>
                ) : null}
              </View>

              {/* Link clickeable a Términos y Condiciones */}
              <View style={styles.termsRow}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.subText}
                  style={styles.termsIcon}
                />
                <TouchableOpacity
                  onPress={() => navigation?.navigate?.('TermsAndConditions')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.termsLinkText, { color: colors.accent }]}>
                    Ver Términos y Condiciones
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                  isLoading && { backgroundColor: colors.muted, shadowOpacity: 0, elevation: 0 },
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primaryContrast} />
                    <Text
                      style={[styles.submitButtonText, { color: colors.primaryContrast }]}
                    >
                      Creando cuenta...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[styles.submitButtonText, { color: colors.primaryContrast }]}
                  >
                    Crear mi cuenta
                  </Text>
                )}
              </TouchableOpacity>

              {/* Mensaje de aceptación de Términos y Condiciones */}
              <Text
                style={[styles.termsMessageText, { color: colors.subText }]}
              >
                Al registrarse, el usuario acepta los Términos y Condiciones.
              </Text>

              <View style={styles.loginPrompt}>
                <Text style={[styles.loginText, { color: colors.subText }]}>
                  ¿Ya tienes una cuenta?
                </Text>
                <TouchableOpacity onPress={() => navigation?.navigate?.('Login')}>
                  <Text style={[styles.loginLinkText, { color: colors.accent }]}>
                    {' '}
                    Inicia sesión
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={successVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, shadowColor: colors.outline },
            ]}
          >
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cuenta creada</Text>
            <Text style={[styles.modalText, { color: colors.subText }]}>
              Todo listo para que inicies sesión y continúes tu camino.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={closeSuccessModal}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalButtonText, { color: colors.primaryContrast }]}>
                Ir a iniciar sesión
              </Text>
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
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    gap: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  termsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsIcon: {
    marginRight: 6,
  },
  termsLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  termsMessageText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  loginPrompt: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
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
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});



