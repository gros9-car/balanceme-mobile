import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../screens/firebase/config";
import { getDeviceIdAsync } from "../utils/deviceId";

// 90 horas en milisegundos.
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 90;

const sessionStartKeyFor = (uid) => `session:startAt:${uid}`;
const passwordVersionKeyFor = (uid) => `session:passwordChangedAt:${uid}`;

export const useSessionSecurity = (user) => {
  const uid = user?.uid ?? null;
  const timeoutRef = useRef(null);
  const lastUidRef = useRef(uid);

  // Limpia el estado local cuando el usuario hace logout explícito.
  useEffect(() => {
    const previousUid = lastUidRef.current;
    const currentUid = user?.uid ?? null;

    if (!currentUid && previousUid) {
      // Solo limpiamos la marca de inicio de sesión. La marca de
      // passwordChangedAt se mantiene para no provocar cierres de
      // sesión en bucle tras cambiar la contraseña.
      const keys = [sessionStartKeyFor(previousUid)];
      AsyncStorage.multiRemove(keys).catch(() => undefined);
    }

    lastUidRef.current = currentUid;
  }, [user?.uid]);

  // Control de duración máxima de la sesión.
  useEffect(() => {
    if (!uid) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const ensureSessionTimeoutAsync = async () => {
      const sessionKey = sessionStartKeyFor(uid);
      const now = Date.now();

      try {
        const raw = await AsyncStorage.getItem(sessionKey);
        let startedAt = null;

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.startedAt === "number") {
              startedAt = parsed.startedAt;
            }
          } catch {
            // Ignoramos el error y tratamos como si no hubiera sesión previa.
          }
        }

        if (!startedAt) {
          startedAt = now;
          await AsyncStorage.setItem(
            sessionKey,
            JSON.stringify({ startedAt }),
          );
        }

        const elapsed = now - startedAt;
        if (elapsed >= SESSION_MAX_AGE_MS) {
          await AsyncStorage.removeItem(sessionKey);
          if (!cancelled) {
            await signOut(auth);
          }
          return;
        }

        const remaining = SESSION_MAX_AGE_MS - elapsed;
        if (!cancelled) {
          timeoutRef.current = setTimeout(async () => {
            try {
              await AsyncStorage.removeItem(sessionKey);
              await signOut(auth);
            } catch {
              // Silenciamos errores de signOut para no bloquear la app.
            }
          }, remaining);
        }
      } catch {
        // Si algo falla al leer/escribir, no rompemos la app.
      }
    };

    ensureSessionTimeoutAsync();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [uid]);

  // Cierre de sesión cuando la contraseña cambia en otro dispositivo.
  useEffect(() => {
    if (!uid) {
      return;
    }

    let unsubscribe = null;
    let cancelled = false;

    const setupListener = async () => {
      const deviceId = await getDeviceIdAsync();
      const userDocRef = doc(db, "users", uid);
      const localKey = passwordVersionKeyFor(uid);

      unsubscribe = onSnapshot(
        userDocRef,
        async (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const data = snapshot.data() ?? {};
          const remoteTs = data.passwordChangedAt?.toMillis
            ? data.passwordChangedAt.toMillis()
            : null;
          const changedBy =
            typeof data.passwordChangedBy === "string"
              ? data.passwordChangedBy
              : null;

          if (!remoteTs) {
            return;
          }

          try {
            const raw = await AsyncStorage.getItem(localKey);
            let localTs = 0;
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (typeof parsed?.passwordChangedAt === "number") {
                  localTs = parsed.passwordChangedAt;
                }
              } catch {
                // Ignoramos errores de parseo.
              }
            }

            // Si este dispositivo fue el que cambió la contraseña, solo
            // actualizamos el valor local para no cerrar su sesión.
            if (changedBy && changedBy === deviceId) {
              await AsyncStorage.setItem(
                localKey,
                JSON.stringify({ passwordChangedAt: remoteTs }),
              );
              return;
            }

            // Para otros dispositivos, comparamos timestamps.
            if (remoteTs <= localTs) {
              return;
            }

            await AsyncStorage.setItem(
              localKey,
              JSON.stringify({ passwordChangedAt: remoteTs }),
            );

            if (!cancelled) {
              await signOut(auth);
            }
          } catch {
            // En caso de error, no interrumpimos la app.
          }
        },
        () => {
          // Silenciamos errores de suscripción.
        },
      );
    };

    setupListener();

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [uid]);
};

