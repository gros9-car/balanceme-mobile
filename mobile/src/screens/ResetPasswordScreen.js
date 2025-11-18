import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

import { auth, db } from './firebase/config';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { getDeviceIdAsync } from '../utils/deviceId';

import { validatePasswordPolicy, passwordPolicySummary } from '../utils/passwordPolicy';

const ResetPasswordScreen = ({ navigation }) => {
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChangePassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const user = auth.currentUser;
    if (!user || !user.email) {
      setErrorMessage('No se encontró una sesión válida. Vuelve a iniciar sesión.');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Debes ingresar tu contraseña actual.');
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      setErrorMessage('Debes ingresar y confirmar la nueva contraseña.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Las contraseñas nuevas no coinciden.');
      return;
    }

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      setErrorMessage(policyError);
      return;
    }

    try {
      setIsSubmitting(true);

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      const deviceId = await getDeviceIdAsync();
      await setDoc(
        doc(db, 'users', user.uid),
        {
          passwordChangedAt: serverTimestamp(),
          passwordChangedBy: deviceId,
        },
        { merge: true },
      );

      setSuccessMessage('Tu contraseña se actualizó correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error al cambiar contraseña:', error);

      let msg = 'Ocurrió un error al actualizar la contraseña.';
      if (error.code === 'auth/wrong-password') {
        msg = 'La contraseña actual no es correcta.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Firebase considera que la nueva contraseña es demasiado débil.';
      } else if (error.code === 'auth/requires-recent-login') {
        msg =
          'Por seguridad debes volver a iniciar sesión antes de cambiar la contraseña.';
      }

      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
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
        {/* Top bar con header alineado al resto de la app */}
        <View
          style={[
            styles.topBarContainer,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(verticalPadding * 0.4, 12),
            },
          ]}
        >
          <View style={contentWidthStyle}>
            <PageHeader
              title="Cambiar contraseña"
              showBack
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: Math.max(verticalPadding * 0.3, 8),
              paddingBottom: verticalPadding,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, contentWidthStyle]}>
            {/* Card de política */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.muted,
                  shadowColor: colors.outline,
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>
                Política de contraseñas
              </Text>
              <Text style={[styles.helperText, { color: colors.subText }]}>
                La nueva contraseña debe cumplir con:
              </Text>
              <Text style={[styles.helperText, { color: colors.subText }]}>
                • {passwordPolicySummary}
              </Text>
            </View>

            {/* Card del formulario */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.muted,
                  shadowColor: colors.outline,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                Contraseña actual
              </Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Ingresa tu contraseña actual"
                placeholderTextColor={colors.subText}
                style={[
                  styles.input,
                  {
                    borderColor: colors.muted,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                Nueva contraseña
              </Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.subText}
                style={[
                  styles.input,
                  {
                    borderColor: colors.muted,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                Confirmar nueva contraseña
              </Text>
              <TextInput
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                placeholder="Confirma la nueva contraseña"
                placeholderTextColor={colors.subText}
                style={[
                  styles.input,
                  {
                    borderColor: colors.muted,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
              />

              {errorMessage ? (
                <View style={styles.messageContainer}>
                  <Ionicons name="warning-outline" size={18} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={styles.messageContainer}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={[styles.successText, { color: colors.accent }]}>
                    {successMessage}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: isSubmitting ? colors.muted : colors.primary,
                  },
                ]}
                onPress={handleChangePassword}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.primaryContrast} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: colors.primaryContrast }]}
                  >
                    Actualizar contraseña
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBarContainer: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  successText: {
    fontSize: 13,
    flex: 1,
  },
});

export default ResetPasswordScreen;
