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

/**
 * Pantalla de inicio de sesión.
 * Valida email/contraseña y utiliza Firebase Auth para autenticar al usuario.
 * Muestra errores específicos por campo y una notificación de éxito.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase/config';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Maneja el envío del formulario de login:
   * - Valida email y contraseña (requeridos, formato y longitud mínima)
   * - Inicia sesión con Firebase (signInWithEmailAndPassword)
   * - En éxito muestra un Alert; en error, mapea códigos comunes a mensajes
   *   de campo y muestra un Alert si aplica.
   */
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
          mapped.email = 'Correo inválido';
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con logo (mismo estilo que Register) */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>BalanceMe</Text>
          <Text style={styles.subtitle}>Bienvenido de vuelta</Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, errors?.email && styles.inputError]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors?.email) setErrors((e)=>({ ...e, email: '' })); }}
                placeholder="tu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors?.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputWrapper, errors?.password && styles.inputError]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors?.password) setErrors((e)=>({ ...e, password: '' })); }}
                placeholder="Tu contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
            {errors?.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Olvidaste tu contraseña */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.linkText, { textAlign: 'right', marginBottom: 16 }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón entrar */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Ingresando...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Ir a registro */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>
              ¿No tienes cuenta?{' '}
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.loginLinkText}>Crear cuenta</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>

        {/* Mensaje motivacional */}
        <Text style={styles.motivationalText}>
          "Pequeños pasos diarios hacen grandes cambios"
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos iguales a RegisterScreen para mantener consistencia visual
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
});
