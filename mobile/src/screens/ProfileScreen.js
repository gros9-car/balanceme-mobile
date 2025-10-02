﻿import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { auth, db, storage } from './firebase/config';
import { useTheme } from '../context/ThemeContext';

const ProfileRow = ({ icon, label, value, colors }) => {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}> 
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

export default function ProfileScreen({ navigation }) {
  const { colors, effectiveTheme } = useTheme();
  const user = auth.currentUser;

  const fallbackName = useMemo(() => {
    if (user?.displayName?.trim()) {
      return user.displayName.trim();
    }
    if (user?.email?.trim()) {
      return user.email.trim().split('@')[0];
    }
    return 'Sin nombre';
  }, [user?.displayName, user?.email]);

  const [profileName, setProfileName] = useState(fallbackName);
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL ?? null);
  const [pendingName, setPendingName] = useState(fallbackName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (!user?.uid) {
        return;
      }

      try {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const name = typeof data?.name === 'string' ? data.name.trim() : '';
          const photo = typeof data?.photoURL === 'string' ? data.photoURL.trim() : '';

          if (isMounted && name) {
            setProfileName(name);
          }
          if (isMounted && photo) {
            setProfilePhoto(photo);
          }
          return;
        }
      } catch (error) {
        // No necesitamos hacer nada especial si falla la carga
      }

      if (isMounted) {
        setProfileName(fallbackName);
        setProfilePhoto(user?.photoURL ?? null);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.photoURL, fallbackName]);

  useEffect(() => {
    setPendingName(profileName);
  }, [profileName]);

  const joinDate = useMemo(() => {
    const creationTime = user?.metadata?.creationTime;
    if (!creationTime) {
      return null;
    }
    const date = new Date(creationTime);
    return date.toLocaleDateString();
  }, [user?.metadata?.creationTime]);

  const moodText = effectiveTheme === 'dark' ? 'Modo nocturno activo' : 'Listo para balancear tu dia';
  const avatarLetter = profileName?.charAt(0)?.toUpperCase() ?? '?';

  const handleSaveName = async () => {
    const normalized = pendingName.trim();
    if (!user?.uid) {
      return;
    }
    if (!normalized) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre valido.');
      return;
    }
    if (normalized === profileName) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { name: normalized }, { merge: true });
      await updateProfile(user, { displayName: normalized });
      setProfileName(normalized);
      setIsEditingName(false);
    } catch (error) {
      Alert.alert('Error', 'No pudimos actualizar tu nombre. Intenta nuevamente.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelNameEdit = () => {
    setPendingName(profileName);
    setIsEditingName(false);
  };

  const handlePickImage = async () => {
    if (!user?.uid) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tus imagenes para cambiar la foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Error', 'No pudimos leer la imagen seleccionada.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
      const contentType = asset.mimeType ?? 'image/jpeg';

      await uploadBytes(storageRef, blob, { contentType });
      const url = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
      await updateProfile(user, { photoURL: url });

      setProfilePhoto(url);
    } catch (error) {
      Alert.alert('Error', 'No pudimos actualizar tu foto. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <StatusBar barStyle={colors.statusBarStyle} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>Debes iniciar sesion para ver tu perfil.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderColor: colors.muted }]}> 
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Perfil</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.outline }]}> 
          <TouchableOpacity
            style={[styles.avatar, profilePhoto ? styles.avatarWithBorder : { backgroundColor: colors.primary }]}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primaryContrast }]}>{avatarLetter}</Text>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.surface, borderColor: colors.muted }]}> 
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera-outline" size={14} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.editContainer}>
              <TextInput
                value={pendingName}
                onChangeText={setPendingName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.subText}
                style={[styles.editInput, { borderColor: colors.muted, color: colors.text }]}
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, { borderColor: colors.muted }]}
                  onPress={handleCancelNameEdit}
                  disabled={savingName}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.editActionText, { color: colors.subText }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleSaveName}
                  disabled={savingName}
                  activeOpacity={0.8}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color={colors.primaryContrast} />
                  ) : (
                    <Text style={[styles.editActionText, { color: colors.primaryContrast }]}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{profileName}</Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.muted }]}
                onPress={() => setIsEditingName(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.caption, { color: colors.subText }]}>{moodText}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.muted }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Datos de la cuenta</Text>
          <ProfileRow icon="mail-outline" label="Correo" value={user.email} colors={colors} />
          <ProfileRow icon="person-circle-outline" label="UID" value={user.uid} colors={colors} />
          <ProfileRow icon="calendar-outline" label="Miembro desde" value={joinDate} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  topBarSpacer: {
    width: 60,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  card: {
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarWithBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editContainer: {
    width: '100%',
    gap: 12,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  editActionButton: {
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
