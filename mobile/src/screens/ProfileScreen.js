import React, { useEffect, useMemo, useState } from 'react';
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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
} from 'firebase/firestore';
import { deleteUser, updateProfile } from 'firebase/auth';

import { auth, db } from './firebase/config';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { useAppAlert } from '../context/AppAlertContext';

const ProfileRow = ({ icon, label, value, colors }) => {
  if (!value) return null;

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

/**
 * Pantalla de perfil del usuario.
 * Permite ver y actualizar datos básicos de la cuenta y configuración
 * personal asociada al usuario autenticado en Firebase.
 */
export default function ProfileScreen({ navigation }) {
  const { colors, effectiveTheme } = useTheme();
  const { showAlert } = useAppAlert();
  const user = auth.currentUser;

  const { horizontalPadding, verticalPadding, maxContentWidth, safeTop, safeBottom } =
    useResponsiveLayout({ maxContentWidth: 920, horizontalFactor: 0.06 });

  const contentWidthStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: maxContentWidth,
      alignSelf: 'center',
    }),
    [maxContentWidth],
  );

  const fallbackName = useMemo(() => {
    if (user?.displayName?.trim()) return user.displayName.trim();
    if (user?.email?.trim()) return user.email.trim().split('@')[0];
    return 'Sin nombre';
  }, [user?.displayName, user?.email]);

  const [profileName, setProfileName] = useState(fallbackName);
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL ?? null);
  const [pendingName, setPendingName] = useState(fallbackName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (!user?.uid) return;

      try {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const name = typeof data?.name === 'string' ? data.name.trim() : '';
          const photo = typeof data?.photoURL === 'string' ? data.photoURL.trim() : '';

          if (isMounted && name) setProfileName(name);
          if (isMounted && photo) setProfilePhoto(photo);

          return;
        }
      } catch (error) {
        // ignore, fall back to auth data
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
    if (!creationTime) return null;

    const date = new Date(creationTime);
    return date.toLocaleDateString();
  }, [user?.metadata?.creationTime]);

  const moodText =
    effectiveTheme === 'dark' ? 'Modo nocturno activo' : 'Listo para balancear tu día';

  const avatarLetter = profileName?.charAt(0)?.toUpperCase() ?? '?';

  const handleSaveName = async () => {
    const normalized = pendingName.trim();
    if (!user?.uid) return;
    if (!normalized) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre válido.');
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

  const deleteCollectionInBatches = async (collectionRef, batchSize = 200) => {
    while (true) {
      const snapshot = await getDocs(query(collectionRef, limit(batchSize)));
      if (snapshot.empty) break;

      const deletions = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletions);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || deletingAccount) return;

    showAlert(
      'Eliminar cuenta',
      'Esta acción borrará tu cuenta y tus datos emocionales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const uid = user.uid;

              const refs = [
                'moods',
                'habits',
                'journal',
                'goals',
                'goalSnapshots',
                'weeklyReports',
                'friendships',
              ].map((col) => collection(db, 'users', uid, col));

              for (const ref of refs) await deleteCollectionInBatches(ref);

              await deleteDoc(doc(db, 'users', uid));

              await deleteUser(user);

              showAlert({
                title: 'Cuenta eliminada',
                message: 'Tu cuenta fue borrada.',
              });
            } catch (error) {
              showAlert({ title: 'Error', message: 'No pudimos eliminar tu cuenta.' });
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: safeBottom },
        ]}
      >
        <StatusBar barStyle={colors.statusBarStyle} />
        <View style={[styles.emptyState, { paddingHorizontal: horizontalPadding }]}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            Debes iniciar sesión para ver tu perfil.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: safeBottom },
      ]}
    >
      <StatusBar barStyle={colors.statusBarStyle} />

      <View
        style={[
          styles.topBarContainer,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: Math.max(12, verticalPadding * 0.4),
          },
        ]}
      >
        <View style={contentWidthStyle}>
          <PageHeader title="Perfil" subtitle="Revisa y actualiza tus datos personales." />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: 8,
            paddingBottom: verticalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, contentWidthStyle]}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, shadowColor: colors.outline },
            ]}
          >
            <View
              style={[
                styles.avatar,
                profilePhoto ? styles.avatarWithBorder : { backgroundColor: colors.primary },
              ]}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primaryContrast }]}>
                  {avatarLetter}
                </Text>
              )}
            </View>

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
                  >
                    <Text style={[styles.editActionText, { color: colors.subText }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.editActionButton,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color={colors.primaryContrast} />
                    ) : (
                      <Text
                        style={[styles.editActionText, { color: colors.primaryContrast }]}
                      >
                        Guardar
                      </Text>
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
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.caption, { color: colors.subText }]}>{moodText}</Text>
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.muted },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Datos de la cuenta
            </Text>

            <ProfileRow icon="mail-outline" label="Correo" value={user.email} colors={colors} />
            <ProfileRow icon="person-circle-outline" label="UID" value={user.uid} colors={colors} />
            <ProfileRow
              icon="calendar-outline"
              label="Miembro desde"
              value={joinDate}
              colors={colors}
            />

            <TouchableOpacity
              style={[
                styles.securityButton,
                {
                  borderColor: colors.accent,
                  backgroundColor: effectiveTheme === 'dark' ? '#111827' : '#eef2ff',
                },
              ]}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Ionicons name="key-outline" size={18} color={colors.accent} />
              <Text style={[styles.securityText, { color: colors.accent }]}>
                Cambiar contraseña
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  borderColor: colors.danger,
                  backgroundColor: effectiveTheme === 'dark' ? '#1f0a0a' : '#fef2f2',
                },
              ]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <View style={styles.deleteContent}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.deleteText, { color: colors.danger }]}>
                    Eliminar mi cuenta
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarContainer: {
    paddingTop: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    gap: 20,
  },
  card: {
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
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
  securityButton: {
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  securityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteText: {
    fontSize: 14,
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
