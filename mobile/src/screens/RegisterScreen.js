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
  Modal,
  Platform,
} from 'react-native';
// Importa las funciones de Firebase necesarias
import { auth, db } from './firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

/**
 * Pantalla de registro de usuarios.
 * Permite crear un usuario con email y contraseña utilizando Firebase Auth
 * y guarda datos adicionales en Firestore. Tras el alta, muestra una
 * notificación de éxito: en web mediante Modal y en iOS/Android con Alert,
 * redirigiendo al Login al confirmar.
 */

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  /**
   * Actualiza el estado del formulario para un campo específico y
   * limpia su error si existía. Se usa como handler de onChangeText
   * en los TextInput.
   * @param {keyof formData} field - nombre del campo (name, email, password, confirmPassword)
   * @param {string} value - nuevo valor del campo
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  /**
   * Valida todos los campos del formulario de registro.
   * - name: requerido, mínimo 2 caracteres
   * - email: requerido, formato válido
   * - password: requerida, mínimo 6 caracteres
   * - confirmPassword: requerida, debe coincidir con password
   * Coloca mensajes de error por campo y retorna true si todo es válido.
   * @returns {boolean}
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para manejar el registro de usuario y guardar datos en Firebase
  /**
   * Envía el formulario de registro:
   * 1) Valida campos
   * 2) Crea el usuario en Firebase Auth
   * 3) Guarda datos adicionales en Firestore
   * 4) Notifica éxito (Modal en web / Alert en nativo) y ofrece ir a Login
   */
  const handleSubmit = async () => {
    // 1. Validar el formulario antes de continuar
    if (!validateForm()) return;

    setIsLoading(true); // Muestra el loader mientras se procesa

    try {
      // 2. Crear el usuario en Firebase Auth con email y contraseña
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user; // Usuario creado

      // 3. Guardar datos adicionales en Firestore (nombre, email, fecha de creación)
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        createdAt: new Date(), // Fecha de creación
      });

      setIsLoading(false); // Oculta el loader
      if (Platform.OS === 'web') {
        // En Web usamos Modal por mejor soporte visual
        setSuccessVisible(true);
      } else {
        // En iOS/Android usamos Alert nativo
        Alert.alert(
          '¡Bienvenido a BalanceMe! 🎉',
          'Tu cuenta ha sido creada exitosamente.',
          [
            { text: 'Ir a iniciar sesión', onPress: () => navigation?.navigate?.('Login') },
          ]
        );
      }

    
    } catch (error) {
      setIsLoading(false); // Oculta el loader si hay error

      // 4. Manejo de errores comunes de Firebase Auth
      let msg = 'Ocurrió un error. Intenta de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'El correo ya está registrado.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Correo inválido.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil.';
      }
      setErrors({ email: msg }); // Muestra el mensaje de error en el campo correspondiente
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
        {/* Header con logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>BalanceMe</Text>
          <Text style={styles.subtitle}>
            Tu espacio seguro para el bienestar emocional
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Crear cuenta</Text>

          {/* Campo Nombre */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Ionicons 
                name="person-outline" 
                size={20} 
                color="#9ca3af" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Tu nombre"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
            </View>
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* Campo Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#9ca3af" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="tu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#9ca3af" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Campo Confirmar Contraseña */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#9ca3af" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Términos y condiciones */}
          <Text style={styles.termsText}>
            Al crear una cuenta, aceptas nuestros{' '}
            <Text style={styles.linkText}>términos y condiciones</Text>{' '}
            y{' '}
            <Text style={styles.linkText}>política de privacidad</Text>
          </Text>

          {/* Botón de registro */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Creando cuenta...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Crear mi cuenta</Text>
            )}
          </TouchableOpacity>

          {/* Enlace para iniciar sesión */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>
              ¿Ya tienes una cuenta?{' '}
              <TouchableOpacity onPress={() => {
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.navigate('Login');
                } else {
                  console.warn('Navegación no configurada. Agrega React Navigation y la ruta \'Login\'.');
                }
              }}>
                <Text style={styles.loginLinkText}>Inicia sesión</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>

        {/* Mensaje motivacional */}
        <Text style={styles.motivationalText}>
          "Tu bienestar mental es tan importante como tu salud física"
        </Text>
      </ScrollView>

      {/* Modal de éxito de registro */}
      <Modal
        transparent
        visible={successVisible}
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.modalTitle}>Registro exitoso</Text>
            <Text style={styles.modalText}>Tu cuenta ha sido creada exitosamente.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSuccessVisible(false);
                navigation?.navigate?.('Login');
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  termsText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  // Modal de éxito
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
