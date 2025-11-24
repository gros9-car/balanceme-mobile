import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "./firebase/config";

import { useTheme } from "../context/ThemeContext";
import PageHeader from "../components/PageHeader";
import useResponsiveLayout from "../hooks/useResponsiveLayout";

// Traduce estados de amistad en etiquetas legibles para la UI.
const statusLabels = {
  accepted: "Amigos",

  pending: "Pendiente",
};

// Normaliza un correo para compararlo sin espacios ni mayúsculas.
const normalizeEmail = (email) => email.trim().toLowerCase();

// Construye un perfil básico aun cuando falten campos en Firestore.
const deriveProfile = (data = {}) => {
  const nameCandidate = typeof data.name === "string" ? data.name.trim() : "";

  const displayCandidate =
    typeof data.displayName === "string" ? data.displayName.trim() : "";

  const emailCandidate =
    typeof data.email === "string" ? data.email.trim() : "";

  const fallbackName = emailCandidate
    ? emailCandidate.split("@")[0]
    : "Usuario";

  return {
    name: nameCandidate || displayCandidate || fallbackName,

    email: emailCandidate,

    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
  };
};

// Pantalla social que administra solicitudes, amistades y acceso al chat directo.
export default function SocialScreen({ navigation }) {
  const { colors } = useTheme();
  const { horizontalPadding, verticalPadding, maxContentWidth, safeTop, safeBottom } =
    useResponsiveLayout({ maxContentWidth: 960, horizontalFactor: 0.05 });
  const contentWidthStyle = useMemo(
    () => ({
      width: "100%",
      maxWidth: maxContentWidth,
      alignSelf: "center",
    }),
    [maxContentWidth],
  );

  const user = auth.currentUser;

  const [searchEmail, setSearchEmail] = useState("");

  const [isSearching, setIsSearching] = useState(false);

  const [searchResult, setSearchResult] = useState(null);

  const [connections, setConnections] = useState({
    friends: [],
    incoming: [],
    outgoing: [],
  });

  const [loadingConnections, setLoadingConnections] = useState(true);

  const [profiles, setProfiles] = useState({});

  const subscriptionsRef = useRef({});

  const [removingFriendId, setRemovingFriendId] = useState(null);

  // Suscribe al perfil del contacto para reflejar cambios en tiempo real.
  const attachProfileListener = (uid) => {
    if (!uid || subscriptionsRef.current[uid]) {
      return;
    }

    subscriptionsRef.current[uid] = onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        setProfiles((prev) => ({
          ...prev,
          [uid]: deriveProfile(snapshot.data() ?? {}),
        }));
      },
    );
  };

  // Cancela los listeners de perfiles que ya no están asociados.
  const detachProfileListeners = (uidList) => {
    const list = Array.isArray(uidList) ? uidList : [uidList];

    const valid = list.filter(Boolean);

    if (!valid.length) {
      return;
    }

    const current = subscriptionsRef.current;

    valid.forEach((uid) => {
      current[uid]?.();

      delete current[uid];
    });

    setProfiles((prev) => {
      const next = { ...prev };

      valid.forEach((uid) => {
        delete next[uid];
      });

      return next;
    });
  };

  // Define un nombre visible aunque falte el displayName en Firebase.
  const displayName = useMemo(() => {
    if (user?.displayName?.trim()) {
      return user.displayName.trim();
    }

    if (user?.email?.trim()) {
      return user.email.trim().split("@")[0];
    }

    return "Tu red";
  }, [user?.displayName, user?.email]);

  useEffect(
    // Limpia todos los suscriptores al desmontar la pantalla.
    () => () => {
      Object.values(subscriptionsRef.current).forEach((unsubscribe) =>
        unsubscribe?.(),
      );

      subscriptionsRef.current = {};
    },
    [],
  );

  useEffect(() => {
    // Escucha los cambios en las amistades del usuario para actualizar listados.
    if (!user?.uid) {
      setConnections({ friends: [], incoming: [], outgoing: [] });

      setLoadingConnections(false);

      return undefined;
    }

    const friendshipsRef = collection(db, "users", user.uid, "friendships");

    const unsubscribe = onSnapshot(
      friendshipsRef,

      (snapshot) => {
        const friends = [];

        const incoming = [];

        const outgoing = [];

        const seenUids = new Set();

        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data() ?? {};

          const status = data.status ?? "pending";

          const targetUid = docSnapshot.id;

          seenUids.add(targetUid);

          const target = {
            uid: targetUid,

            status,

            initiatedBy: data.initiatedBy,

            name: data.name ?? "Usuario",

            email: data.email ?? "",

            hasUnread: Boolean(data.unread),
          };

          if (status === "accepted") {
            friends.push(target);
          } else if (status === "pending") {
            if (data.initiatedBy && data.initiatedBy !== user.uid) {
              incoming.push(target);
            } else {
              outgoing.push(target);
            }
          }
        });

        setConnections({ friends, incoming, outgoing });

        const currentSubscriptions = subscriptionsRef.current;

        const toDetach = Object.keys(currentSubscriptions).filter(
          (uid) => !seenUids.has(uid),
        );

        if (toDetach.length) {
          detachProfileListeners(toDetach);
        }

        seenUids.forEach((uid) => attachProfileListener(uid));

        setLoadingConnections(false);
      },

      () => {
        setConnections({ friends: [], incoming: [], outgoing: [] });

        setLoadingConnections(false);
      },
    );

    return unsubscribe;
}, [user?.uid]);

  // Crea o actualiza el documento de amistad para ambos usuarios.
  const ensureFriendDoc = async (ownerUid, targetUid, payload) => {
    const ref = doc(db, "users", ownerUid, "friendships", targetUid);

    await setDoc(ref, payload, { merge: true });
  };

  // Busca un usuario por correo y prepara el resultado para enviar solicitud.
  const handleSearch = async () => {
    const email = normalizeEmail(searchEmail);

    if (!email) {
      return;
    }

    if (!user?.uid) {
      navigation?.replace?.("Login");

      return;
    }

    if (email === normalizeEmail(user.email ?? "")) {
      Alert.alert("Ups", "No puedes agregarte a ti mismo.");

      return;
    }

    setIsSearching(true);

    setSearchResult(null);

    try {
      const usersRef = collection(db, "users");

      const result = await getDocs(
        query(usersRef, where("email", "==", email)),
      );

      if (result.empty) {
        Alert.alert("No encontrado", "No ubicamos un usuario con ese correo.");

        setSearchResult(null);

        return;
      }

      const docSnapshot = result.docs[0];

      setSearchResult({
        uid: docSnapshot.id,

        email,

        name:
          docSnapshot.data()?.name ??
          docSnapshot.data()?.displayName ??
          docSnapshot.data()?.email ??
          "Usuario",
      });
    } catch (error) {
      Alert.alert("Error", "No pudimos buscar al usuario. Intenta de nuevo.");
    } finally {
      setIsSearching(false);
    }
  };

  // Registra la solicitud de amistad para ambos perfiles.
  const sendRequest = async (target) => {
    if (!user?.uid) {
      navigation?.replace?.("Login");

      return;
    }

    const payload = {
      status: "pending",

      initiatedBy: user.uid,

      name: target.name,

      email: target.email,
    };

    try {
      await ensureFriendDoc(user.uid, target.uid, payload);

      await ensureFriendDoc(target.uid, user.uid, {
        status: "pending",

        initiatedBy: user.uid,

        name: displayName,

        email: user.email ?? "",
      });

      Alert.alert("Solicitud enviada", "Cuando la acepten podrán conversar.");

      setSearchResult(null);

      setSearchEmail("");
    } catch (error) {
      Alert.alert("Error", "No pudimos enviar la solicitud.");
    }
  };

  // Marca como aceptada la solicitud entrante y sincroniza ambos lados.
  const acceptRequest = async (friend) => {
    if (!user?.uid) {
      return;
    }

    try {
      await ensureFriendDoc(user.uid, friend.uid, {
        status: "accepted",

        name: friend.name,

        email: friend.email,

        initiatedBy: friend.initiatedBy,
      });

      await ensureFriendDoc(friend.uid, user.uid, {
        status: "accepted",

        name: displayName,

        email: user.email ?? "",

        initiatedBy: friend.initiatedBy,
      });
    } catch (error) {
      Alert.alert("Error", "No pudimos aceptar la solicitud.");
    }
  };

  // Elimina la relación de amistad y limpia los listeners asociados.
  const performRemoveFriend = async (friend) => {
    if (!user?.uid) {
      return;
    }

    setRemovingFriendId(friend.uid);

    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid, "friendships", friend.uid)),

        deleteDoc(doc(db, "users", friend.uid, "friendships", user.uid)),
      ]);

      detachProfileListeners(friend.uid);

      Alert.alert("Amistad eliminada", "La conexión se elimino correctamente.");
    } catch (error) {
      Alert.alert(
        "Error",
        "No pudimos eliminar la amistad. Intenta más tarde.",
      );
    } finally {
      setRemovingFriendId(null);
    }
  };

  // Pide confirmación antes de borrar definitivamente la amistad.
  const confirmRemoveFriend = (friend) => {
    const nameToShow = friend.name ?? "tu contacto";

    Alert.alert(
      "Eliminar amistad",

      `Se borrará la conexión con ${nameToShow}.`,

      [
        { text: "Cancelar", style: "cancel" },

        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => performRemoveFriend(friend),
        },
      ],
    );
  };

  // Abre el chat directo utilizando la información más reciente del perfil.
  const navigateToChat = (friend) => {
    const profile = profiles[friend.uid] ?? {};

    navigation.navigate("DirectChat", {
      friendUid: friend.uid,

      friendName: profile.name ?? friend.name,

      friendEmail: profile.email ?? friend.email,
    });
  };

  if (!user?.uid) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: safeBottom },
        ]}
      >
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.background}
        />

        <View
          style={[
            styles.centered,
            { paddingHorizontal: horizontalPadding, paddingVertical: verticalPadding },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={28}
            color={colors.subText}
          />

          <Text style={[styles.centeredText, { color: colors.subText }]}>
            Inicia sesion para gestionar tu red de apoyo.
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
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
      />

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
        contentInsetAdjustmentBehavior="always"
      >
        <View style={[styles.content, contentWidthStyle]}>
          <PageHeader
            title="Red de apoyo"
            subtitle="Envía solicitudes, acepta amistades y conversa con quienes confías."
          />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Invitar por correo
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchEmail}
              onChangeText={setSearchEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.subText}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.searchInput,
                { borderColor: colors.muted, color: colors.text },
              ]}
            />

            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              disabled={isSearching}
              activeOpacity={0.85}
            >
              {isSearching ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryContrast}
                />
              ) : (
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.primaryContrast}
                />
              )}
            </TouchableOpacity>
          </View>

          {searchResult ? (
            <View style={[styles.resultCard, { borderColor: colors.muted }]}>
              <View style={styles.resultInfo}>
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color={colors.primary}
                />

                <View>
                  <Text style={[styles.resultName, { color: colors.text }]}>
                    {searchResult.name}
                  </Text>

                  <Text style={[styles.resultEmail, { color: colors.subText }]}>
                    {searchResult.email}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.inviteButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => sendRequest(searchResult)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.inviteButtonText,
                    { color: colors.primaryContrast },
                  ]}
                >
                  Enviar solicitud
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Solicitudes recibidas
          </Text>

          {loadingConnections ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : connections.incoming.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              No tienes solicitudes pendientes.
            </Text>
          ) : (
            connections.incoming.map((friend) => {
              const profile = profiles[friend.uid] ?? {};

              const friendName = profile.name ?? friend.name;

              const friendEmail = profile.email ?? friend.email;

              const hasUnread = Boolean(friend.hasUnread);

              return (
                <View
                  key={friend.uid}
                  style={[styles.friendRow, { borderColor: colors.muted }]}
                >
                  <View style={styles.friendInfo}>
                    <Ionicons
                      name="person-add-outline"
                      size={22}
                      color={colors.primary}
                    />

                    <View>
                      <Text style={[styles.friendName, { color: colors.text }]}>
                        {friendName}
                      </Text>

                      <Text
                        style={[styles.friendEmail, { color: colors.subText }]}
                      >
                        {friendEmail}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() =>
                      acceptRequest({
                        ...friend,
                        name: friendName,
                        email: friendEmail,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.acceptButtonText,
                        { color: colors.primaryContrast },
                      ]}
                    >
                      Aceptar
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Amistades
          </Text>

          {loadingConnections ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : connections.friends.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Cuando acepten una solicitud podran chatear en privado.
            </Text>
          ) : (
            connections.friends.map((friend) => {
              const profile = profiles[friend.uid] ?? {};

              const friendName = profile.name ?? friend.name;

              const friendEmail = profile.email ?? friend.email;

              const hasUnread = Boolean(friend.hasUnread);

              return (
                <View
                  key={friend.uid}
                  style={[styles.friendRow, { borderColor: colors.muted }]}
                >
                  <TouchableOpacity
                    style={styles.friendInfoButton}
                    onPress={() => navigateToChat(friend)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.friendInfo}>
                      <Ionicons
                        name="person-circle-outline"
                        size={24}
                        color={colors.primary}
                      />

                      <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            style={[styles.friendName, { color: colors.text }]}
                          >
                            {friendName}
                          </Text>
                          {hasUnread ? (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: colors.primary,
                              }}
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.friendEmail,
                            { color: colors.subText },
                          ]}
                        >
                          {friendEmail}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.friendActions}>
                    <TouchableOpacity
                      style={[
                        styles.friendActionButton,
                        {
                          borderColor: colors.muted,
                          backgroundColor: colors.muted,
                        },
                      ]}
                      onPress={() => navigateToChat(friend)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.friendActionButton,
                        { borderColor: colors.danger },
                        removingFriendId === friend.uid && { opacity: 0.6 },
                      ]}
                      onPress={() =>
                        confirmRemoveFriend({
                          ...friend,
                          name: friendName,
                          email: friendEmail,
                        })
                      }
                      activeOpacity={0.85}
                      disabled={removingFriendId === friend.uid}
                    >
                      {removingFriendId === friend.uid ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.danger}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.outline },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Solicitudes enviadas
          </Text>

          {loadingConnections ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : connections.outgoing.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aún no has enviado solicitudes.
            </Text>
          ) : (
            connections.outgoing.map((friend) => {
              const profile = profiles[friend.uid] ?? {};

              const friendName = profile.name ?? friend.name;

              const friendEmail = profile.email ?? friend.email;

              return (
                <View
                  key={friend.uid}
                  style={[styles.friendRow, { borderColor: colors.muted }]}
                >
                  <View style={styles.friendInfo}>
                    <Ionicons
                      name="paper-plane-outline"
                      size={22}
                      color={colors.primary}
                    />

                    <View>
                      <Text style={[styles.friendName, { color: colors.text }]}>
                        {friendName}
                      </Text>

                      <Text
                        style={[styles.friendEmail, { color: colors.subText }]}
                      >
                        {friendEmail}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.statusLabel, { color: colors.subText }]}>
                    {statusLabels[friend.status] ?? friend.status}
                  </Text>
                </View>
              );
            })
          )}
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

  scrollContainer: {
    flexGrow: 1,

    alignItems: "center",
  },

  content: {
    width: "100%",

    gap: 20,
  },


  card: {
    borderRadius: 24,

    padding: 20,

    gap: 16,

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.08,

    shadowRadius: 8,

    elevation: 4,
  },

  sectionTitle: {
    fontSize: 18,

    fontWeight: "600",
  },

  searchRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  searchInput: {
    flex: 1,

    borderWidth: 1,

    borderRadius: 16,

    paddingHorizontal: 16,

    paddingVertical: 12,

    fontSize: 14,
  },

  searchButton: {
    width: 44,

    height: 44,

    borderRadius: 22,

    justifyContent: "center",

    alignItems: "center",
  },

  resultCard: {
    borderWidth: 1,

    borderRadius: 18,

    padding: 16,

    gap: 12,
  },

  resultInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  resultName: {
    fontSize: 16,

    fontWeight: "600",
  },

  resultEmail: {
    fontSize: 13,

    color: "#6b7280",
  },

  inviteButton: {
    alignSelf: "flex-end",

    borderRadius: 14,

    paddingHorizontal: 18,

    paddingVertical: 10,
  },

  inviteButtonText: {
    fontSize: 14,

    fontWeight: "600",
  },

  friendRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    borderWidth: 1,

    borderRadius: 18,

    padding: 16,

    marginBottom: 12,

    gap: 12,
  },

  friendInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },

  friendInfoButton: {
    flex: 1,
  },

  friendActions: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  friendActionButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    justifyContent: "center",

    alignItems: "center",

    borderWidth: 1,
  },

  friendName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },

  friendEmail: {
    fontSize: 13,
    color: "#6b7280",
    flexShrink: 1,
  },

  acceptButton: {
    borderRadius: 14,

    paddingHorizontal: 18,

    paddingVertical: 8,
  },

  acceptButtonText: {
    fontSize: 13,

    fontWeight: "600",
  },

  statusLabel: {
    fontSize: 13,

    fontWeight: "500",
  },

  emptyText: {
    fontSize: 13,

    color: "#6b7280",
  },

  centered: {
    alignItems: "center",

    gap: 12,
  },

  centeredText: {
    fontSize: 14,

    textAlign: "center",
  },
});
