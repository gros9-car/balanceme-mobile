import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

// Pantalla de inicio de sesión que valida credenciales y entra a la app.
export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Evalúa entradas, intenta autenticar y maneja errores comunes.
  const handleLogin = async () => {
    const newErrors = {};
    const emailTrim = email.trim();
    if (!emailTrim) newErrors.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(emailTrim)) newErrors.email = 'Correo inválido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    else if (password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, emailTrim, password);
      setIsLoading(false);
      Alert.alert('Bienvenido', 'Inicio de sesión exitoso');
      navigation.navigate('Home');
    } catch (error) {
      setIsLoading(false);
      let msg = 'No pudimos iniciar sesión.';
      const mapped = {};
      switch (error.code) {
        case 'auth/invalid-email':
          mapped.email = 'Correo invalido';
          break;
        case 'auth/user-not-found':
          mapped.email = 'No existe una cuenta con ese correo';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          mapped.password = 'Contraseña incorrecta';
          break;
        case 'auth/too-many-requests':
          msg = 'Demasiados intentos. Intenta más tarde.';
          break;
        case 'auth/network-request-failed':
          msg = 'Problema de red. Revisa tu conexión.';
          break;
        default:
          break;
      }
      if (Object.keys(mapped).length) setErrors(mapped);
      if (!Object.keys(mapped).length || msg !== 'No pudimos iniciar sesión.') {
        Alert.alert('Error', msg);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={[styles.subtitle, { color: colors.subText }]}>Bienvenido de vuelta</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
          <Text style={[styles.formTitle, { color: colors.text }]}>Iniciar sesion</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Correo electronico</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.muted, borderColor: colors.muted },
                errors?.email && { borderColor: colors.danger },
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
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors?.email) setErrors((e) => ({ ...e, email: '' }));
                }}
                placeholder="tu@email.com"
                placeholderTextColor={colors.subText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors?.email ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.muted, borderColor: colors.muted },
                errors?.password && { borderColor: colors.danger },
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
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors?.password) setErrors((e) => ({ ...e, password: '' }));
                }}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.subText}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.subText}
                />
              </TouchableOpacity>
            </View>
            {errors?.password ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>Olvide mi contraseña</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              isLoading && { backgroundColor: colors.muted, shadowOpacity: 0, elevation: 0 },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primaryContrast} />
                <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Ingresando...</Text>
              </View>
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <Text style={[styles.loginText, { color: colors.subText }]}>No tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.loginLinkText, { color: colors.accent }]}> Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.motivationalText, { color: colors.subText }]}>Pequenos pasos crean grandes cambios.</Text>
        </View>
      </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  inputIcon: {
    marginRight: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  linkText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
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
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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
});
