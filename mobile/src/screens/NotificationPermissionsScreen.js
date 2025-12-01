import React, { useEffect, useState } from "react";
import {
  StatusBar,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import PageHeader from "../components/PageHeader";
import { getNotificationPermissionStatus } from "../hooks/useNotificationSetup";

/**
 * Pantalla que guía al usuario para conceder o revisar
 * los permisos de notificaciones del sistema y de la app.
 */
const NotificationPermissionsScreen = () => {
  const { colors } = useTheme();
  const [statusLabel, setStatusLabel] = useState(
    "Comprobando permisos del sistema...",
  );

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const settings = await getNotificationPermissionStatus();
        if (!isMounted) {
          return;
        }

        const granted =
          settings?.granted || settings?.status === "granted";

        if (granted) {
          setStatusLabel("Permitidas");
        } else {
          setStatusLabel("Bloqueadas o restringidas");
        }
      } catch {
        if (isMounted) {
          setStatusLabel("No disponible");
        }
      }
    };

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const openAppSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="always"
      >
        <PageHeader
          title="Permisos de notificación"
          subtitle="Ayuda para activar alertas de BalanceMe en tu dispositivo."
          rightContent={
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={28}
                color={colors.primaryContrast}
              />
            </View>
          }
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.muted },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Estado actual
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Permisos de notificación del sistema:{" "}
            <Text style={{ fontWeight: "600", color: colors.text }}>
              {statusLabel}
            </Text>
          </Text>

          <TouchableOpacity
            style={[styles.settingsButton, { borderColor: colors.primary }]}
            onPress={openAppSettings}
            activeOpacity={0.85}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "settings-outline" : "cog-outline"}
              size={18}
              color={colors.primary}
            />
            <Text
              style={[styles.settingsButtonText, { color: colors.primary }]}
            >
              Abrir ajustes de la app
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.muted },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            En dispositivos Android (incluido MIUI)
          </Text>
          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Además de permitir las notificaciones, algunos fabricantes (por
            ejemplo Xiaomi / MIUI) requieren activar opciones adicionales para
            que las alertas se muestren correctamente, incluso en segundo plano.
          </Text>

          <Text style={[styles.paragraph, { color: colors.subText }]}>
            En la pantalla de ajustes de la app de BalanceMe, busca y activa:
          </Text>

          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Activa: Mostrar en pantalla de bloqueo
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Activa: Mostrar ventanas emergentes
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Activa: Abrir nuevas ventanas mientras se ejecuta en segundo
              plano
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subText }]}>
              • Activa: Accesos directos en la Pantalla de inicio (si aplica)
            </Text>
          </View>

          <Text style={[styles.paragraph, { color: colors.subText }]}>
            Si después de activar estas opciones sigues sin recibir
            notificaciones, revisa también que el ahorro de batería no esté
            limitando la actividad en segundo plano de BalanceMe.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingsButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default NotificationPermissionsScreen;
