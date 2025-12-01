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
  KeyboardAvoidingView,
  Modal,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { useAppAlert } from '../context/AppAlertContext';
import { passwordPolicySummary } from '../utils/passwordPolicy';

// --- Hook de responsividad ---
const useResponsiveForgot = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const horizontalPadding = Math.max(16, Math.min(32, width * 0.08));
  const verticalPadding = Math.max(24, Math.min(40, height * 0.06));

  const maxContentWidth = Math.min(isTablet ? 520 : 420, width * 0.95);

  const titleFont = isSmall ? 26 : 32;
  const subtitleFont = isSmall ? 13 : 14;
  const formTitleFont = isSmall ? 18 : 22;
  const labelFont = isSmall ? 13 : 14;
  const inputHeight = isSmall ? 46 : 52;
  const buttonHeight = isSmall ? 46 : 52;

  const keyboardVerticalOffset = Platform.select({
    ios: insets.top + 40,
    android: 0,
    default: 0,
  });

  return {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    titleFont,
    subtitleFont,
    formTitleFont,
    labelFont,
    inputHeight,
    buttonHeight,
    keyboardVerticalOffset,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
};

// Pantalla de recuperación que valida el correo y envía el enlace de restablecimiento.
/**
 * Pantalla para iniciar el flujo de recuperación de contraseña.
 * Permite al usuario solicitar un correo de restablecimiento.
 */
export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const { showAlert } = useAppAlert();
  const {
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    formTitleFont,
    labelFont,
    inputHeight,
    buttonHeight,
    keyboardVerticalOffset,
    safeTop,
    safeBottom,
  } = useResponsiveForgot();

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
        showAlert(
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
      showAlert({
        title: 'Error',
        message,
      });
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
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingHorizontal: horizontalPadding,
              // menos espacio arriba para que no quede tan abajo
              paddingTop: Math.max(verticalPadding * 0.4, 12),
              paddingBottom: Math.max(verticalPadding, 24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: maxContentWidth,
              alignSelf: 'center',
              gap: 24,
            }}
          >
            <PageHeader
              title="Recupera tu acceso"
              subtitle="Ingresa tu correo para restablecer tu contraseña."
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

            {/* FORM CARD */}
            <View
              style={[
                styles.formContainer,
                { backgroundColor: colors.surface, shadowColor: colors.outline },
              ]}
            >
              <Text
                style={[
                  styles.formTitle,
                  { color: colors.text, fontSize: formTitleFont },
                ]}
              >
                Restablecer contraseña
              </Text>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.text, fontSize: labelFont },
                  ]}
                >
                  Correo electrónico
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.muted,
                      height: inputHeight,
                    },
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
                {errors.email ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.email}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    height: buttonHeight,
                  },
                  isLoading && {
                    backgroundColor: colors.muted,
                    shadowOpacity: 0,
                    elevation: 0,
                  },
                ]}
                onPress={handleReset}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primaryContrast} />
                    <Text
                      style={[
                        styles.submitButtonText,
                        { color: colors.primaryContrast },
                      ]}
                    >
                      Enviando...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      { color: colors.primaryContrast },
                    ]}
                  >
                    Enviar enlace
                  </Text>
                )}
              </TouchableOpacity>

              <Text
                style={[
                  styles.policyText,
                  { color: colors.subText, fontSize: labelFont - 1 },
                ]}
              >
                Recuerda: {passwordPolicySummary}
              </Text>

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation?.navigate?.('Login')}
              >
                <Ionicons name="arrow-back" size={18} color={colors.accent} />
                <Text
                  style={[
                    styles.backToLoginText,
                    { color: colors.accent, fontSize: labelFont },
                  ]}
                >
                  Volver a iniciar sesión
                </Text>
              </TouchableOpacity>

              <Text
                style={[
                  styles.motivationalText,
                  { color: colors.subText, fontSize: labelFont - 1 },
                ]}
              >
                Estamos contigo en cada paso.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL WEB */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, shadowColor: colors.outline },
            ]}
          >
            <Ionicons name="mail" size={40} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Correo enviado
            </Text>
            <Text style={[styles.modalText, { color: colors.subText }]}>
              Revisa tu bandeja y sigue las instrucciones para crear una nueva contraseña.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={closeModal}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: colors.primaryContrast },
                ]}
              >
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
    // El color de fondo real viene de ThemeContext a traves de SafeAreaView.
    // Mantener transparente permite que el modo oscuro se aplique igual que en otras pantallas.
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    // clave: no centrar verticalmente
    justifyContent: 'flex-start',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
  },
  submitButton: {
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
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  backToLoginText: {
    fontWeight: '500',
  },
  motivationalText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  policyText: {
    textAlign: 'center',
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
