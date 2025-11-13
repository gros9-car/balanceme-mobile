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

import { Ionicons } from '@expo/vector-icons';

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { doc, setDoc } from 'firebase/firestore';



import { auth, db } from './firebase/config';

import { useTheme } from '../context/ThemeContext';



// Pantalla de registro que maneja formulario, validaciones y creaci├│n de cuentas.

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export default function RegisterScreen({ navigation }) {

  const { colors } = useTheme();

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



  // Actualiza el campo editado y limpia su error si exist├¡a.

  const handleInputChange = (field, value) => {

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {

      setErrors((prev) => ({ ...prev, [field]: '' }));

    }

  };



  // Aplica validaciones b├ísicas sobre nombre, correo y contrase├▒as.

  const validateForm = () => {

    const nextErrors = {};



    if (!formData.name.trim()) {

      nextErrors.name = 'El nombre es requerido';

    } else if (formData.name.trim().length < 2) {

      nextErrors.name = 'El nombre debe tener al menos 2 caracteres';

    }



    if (!formData.email.trim()) {

      nextErrors.email = 'El correo es requerido';

    } else if (!EMAIL_REGEX.test(formData.email)) {

      nextErrors.email = 'Correo invalido';

    }



    const password = formData.password ?? '';

    if (!password) {

      nextErrors.password = 'La contrasena es requerida';

    } else {

      const patterns = [

        { regex: /.{8,}/, message: 'Debe tener al menos 8 caracteres' },

        { regex: /[A-Z]/, message: 'Incluye al menos una letra mayuscula' },

        { regex: /[a-z]/, message: 'Incluye al menos una letra minuscula' },

        { regex: /[0-9]/, message: 'Incluye al menos un numero' },

        { regex: /[^A-Za-z0-9]/, message: 'Incluye al menos un caracter especial' },

      ];



      const failed = patterns.find((rule) => !rule.regex.test(password));

      if (failed) {

        nextErrors.password = `La contrasena no cumple la politica: ${failed.message}.`;

      }

    }



    if (!formData.confirmPassword) {

      nextErrors.confirmPassword = 'Confirma tu contrasena';

    } else if (formData.confirmPassword !== password) {

      nextErrors.confirmPassword = 'Las contrasenas no coinciden';

    }



    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;

  };

  console.log('Hola hola');



  // Crea la cuenta en Firebase Auth y guarda el perfil en Firestore.

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

        Alert.alert('Bienvenido a BalanceMe', 'Tu cuenta est├í lista.', [

          { text: 'Ir a iniciar sesion', onPress: () => navigation?.navigate?.('Login') },

        ]);

      }

    } catch (error) {

      let message = 'No pudimos crear tu cuenta. Intenta nuevamente.';

      if (error.code === 'auth/email-already-in-use') {

        message = 'Ese correo ya esta registrado.';

      } else if (error.code === 'auth/invalid-email') {

        message = 'Correo invalido.';

      } else if (error.code === 'auth/weak-password') {

        message = 'La contrasena es muy debil.';

      }

      Alert.alert('Error', message);

    } finally {

      setIsLoading(false);

    }

  };



  // Oculta el modal web y regresa a la pantalla de inicio de sesi├│n.

  const closeSuccessModal = () => {

    setSuccessVisible(false);

    navigation?.navigate?.('Login');

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

          <Text style={[styles.subtitle, { color: colors.subText }]}>Construyamos tu bienestar</Text>

        </View>



        <View style={[styles.formContainer, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 

          <Text style={[styles.formTitle, { color: colors.text }]}>Crear cuenta</Text>



          <View style={styles.inputGroup}>

            <Text style={[styles.label, { color: colors.text }]}>Nombre completo</Text>

            <View

              style={[

                styles.inputWrapper,

                { backgroundColor: colors.muted, borderColor: colors.muted },

                errors.name && { borderColor: colors.danger },

              ]}

            >

              <Ionicons name="person-outline" size={20} color={colors.subText} style={styles.inputIcon} />

              <TextInput

                style={[styles.textInput, { color: colors.text }]}

                value={formData.name}

                onChangeText={(text) => handleInputChange('name', text)}

                placeholder="Tu nombre"

                placeholderTextColor={colors.subText}

                autoCapitalize="words"

              />

            </View>

            {errors.name ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text> : null}

          </View>



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

            {errors.email ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text> : null}

          </View>



          <View style={styles.inputGroup}>

            <Text style={[styles.label, { color: colors.text }]}>Contrase├▒a</Text>

            <View

              style={[

                styles.inputWrapper,

                { backgroundColor: colors.muted, borderColor: colors.muted },

                errors.password && { borderColor: colors.danger },

              ]}

            >

              <Ionicons name="lock-closed-outline" size={20} color={colors.subText} style={styles.inputIcon} />

              <TextInput

                style={[styles.textInput, { color: colors.text }]}

                value={formData.password}

                onChangeText={(text) => handleInputChange('password', text)}

                placeholder="Minimo 6 caracteres"

                placeholderTextColor={colors.subText}

                secureTextEntry={!showPassword}

                autoCapitalize="none"

              />

              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword((prev) => !prev)}>

                <Ionicons

                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}

                  size={20}

                  color={colors.subText}

                />

              </TouchableOpacity>

            </View>

            {errors.password ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text> : null}

          </View>



          <View style={styles.inputGroup}>

            <Text style={[styles.label, { color: colors.text }]}>Confirmar contrase├▒a</Text>

            <View

              style={[

                styles.inputWrapper,

                { backgroundColor: colors.muted, borderColor: colors.muted },

                errors.confirmPassword && { borderColor: colors.danger },

              ]}

            >

              <Ionicons name="shield-checkmark-outline" size={20} color={colors.subText} style={styles.inputIcon} />

              <TextInput

                style={[styles.textInput, { color: colors.text }]}

                value={formData.confirmPassword}

                onChangeText={(text) => handleInputChange('confirmPassword', text)}

                placeholder="Repite tu contrasena"

                placeholderTextColor={colors.subText}

                secureTextEntry={!showConfirmPassword}

                autoCapitalize="none"

              />

              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword((prev) => !prev)}>

                <Ionicons

                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}

                  size={20}

                  color={colors.subText}

                />

              </TouchableOpacity>

            </View>

            {errors.confirmPassword ? (

              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.confirmPassword}</Text>

            ) : null}

          </View>



          <Text style={[styles.termsText, { color: colors.subText }]}>Al registrarte aceptas nuestros{' '}

            <Text style={[styles.linkText, { color: colors.accent }]}>terminos y condiciones</Text>{' '}y{' '}

            <Text style={[styles.linkText, { color: colors.accent }]}>politica de privacidad</Text>.

          </Text>



          <TouchableOpacity

            style={[

              styles.submitButton,

              { backgroundColor: colors.primary, shadowColor: colors.primary },

              isLoading && { backgroundColor: colors.muted, shadowOpacity: 0, elevation: 0 },

            ]}

            onPress={handleSubmit}

            disabled={isLoading}

            activeOpacity={0.85}

          >

            {isLoading ? (

              <View style={styles.loadingRow}>

                <ActivityIndicator size="small" color={colors.primaryContrast} />

                <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Creando cuenta...</Text>

              </View>

            ) : (

              <Text style={[styles.submitButtonText, { color: colors.primaryContrast }]}>Crear mi cuenta</Text>

            )}

          </TouchableOpacity>



          <View style={styles.loginPrompt}>

            <Text style={[styles.loginText, { color: colors.subText }]}>Ya tienes una cuenta?</Text>

            <TouchableOpacity onPress={() => navigation?.navigate?.('Login')}>

              <Text style={[styles.loginLinkText, { color: colors.accent }]}> Inicia sesi├│n</Text>

            </TouchableOpacity>

          </View>



          <Text style={[styles.motivationalText, { color: colors.subText }]}>Tu bienestar tambien merece agenda.</Text>

        </View>

      </ScrollView>



      <Modal

        visible={successVisible}

        transparent

        animationType="fade"

        statusBarTranslucent

      >

        <View style={styles.modalOverlay}>

          <View style={[styles.modalCard, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 

            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Cuenta creada</Text>

            <Text style={[styles.modalText, { color: colors.subText }]}>Todo listo para que inicies sesion y continues tu camino.</Text>

            <TouchableOpacity

              style={[styles.modalButton, { backgroundColor: colors.primary }]}

              onPress={closeSuccessModal}

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

    fontSize: 24,

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

  eyeIcon: {

    padding: 4,

  },

  errorText: {

    fontSize: 12,

    color: '#ef4444',

  },

  termsText: {

    fontSize: 12,

    color: '#6b7280',

    lineHeight: 18,

    textAlign: 'center',

  },

  linkText: {

    color: '#3b82f6',

    textDecorationLine: 'underline',

    fontWeight: '500',

  },

  submitButton: {

    height: 54,

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

  loginPrompt: {

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 4,

  },

  loginText: {

    fontSize: 14,

    color: '#6b7280',

  },

  loginLinkText: {

    fontSize: 14,

    color: '#3b82f6',

    fontWeight: '600',

  },

  motivationalText: {

    fontSize: 12,

    color: '#6b7280',

    fontStyle: 'italic',

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

    maxWidth: 360,

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


