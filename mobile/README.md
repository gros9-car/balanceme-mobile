# BalanceMe Responsive Architecture

Esta guía resume el plan propuesto para que la app soporte Android, iOS y Web (Expo/React Native) usando un sistema de diseño unificado y componentes reutilizables.

## 1. Principios de diseño
- Flexbox + porcentajes, evita medidas fijas; piensa por tamaño (phone/tablet/desktop) en lugar de plataforma.
- Tokens centralizados para color, tipografía, radios y sombras (`src/theme`).
- Safe areas y `StatusBar` controlados desde `src/components/Screen.tsx`.
- Helpers (`src/theme/responsive.ts`, `src/theme/platform.ts`) eliminan condicionales repetidos en cada vista.

## 2. Librerías y utilidades clave
- Expo SDK 54 ya trae `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-web`.
- Añadido `expo-haptics`; considera sumar `expo-device`, `expo-constants` y `react-native-reanimated` cuando se implementen gestos avanzados.
- Util propio `ms()` para escala tipográfica reactiva (ver `src/theme/responsive.ts`).

## 3. Breakpoints, shadow y tokens
- `src/theme/responsive.ts`: breakpoints (`phone`, `tablet`, `desktop`), helpers de plataforma (`isAndroid`, `isWeb`) y grilla `columns()`.
- `shadow(level)` traduce un único nivel semántico a iOS/Android/Web.
- Espacings (`spacing`) y tipografías (`ms()`) alimentan al tema base (`src/theme/index.ts`).

## 4. Componentes compartidos
- `Screen`: SafeArea + StatusBar + padding consistente + soporte scroll.
- `Button`: ripple condicional y tokens de color.
- `Grid`: composable responsive grid para cards/listas.
- Usa `src/navigation/options.ts` como `screenOptions` para alinear los headers con el tema.

## 5. Compatibilidad por plataforma
- `src/theme/platform.ts` expone `platformStyles` (altura de header, ripple, cursor web).
- `src/platform/index.ts` agrupa diferencias funcionales (p.ej. `vibrateSuccess`, `filePathHint`). Añade más funciones aquí para mantener los componentes limpios.

## 6. Layout de ejemplo
- Ver `src/components/Screen.tsx`, `src/components/Button.tsx`, `src/components/Grid.tsx` y reutilizarlos dentro de pantallas (p.ej. `HomeScreen`).
- Cuando conviertas una pantalla existente, reemplaza medidas fijas por `theme.space`, tipografías por `theme.text` y sombras por `shadow(level)`.

## 7. Checklist de migración
1. Extrae colores/espaciados/tipografías actuales al `theme` si todavía viven dentro de cada pantalla.
2. Envuelve cada pantalla en `Screen` (añade `scroll` cuando corresponda).
3. Centraliza headers en `defaultScreenOptions`.
4. Cambia sombras inline por `shadow(level)` y tamaños por `ms()`.
5. Prueba en 3 tamaños de viewport (375 / 768 / 1280) en Expo Web y en dispositivos reales/emuladores.

## 8. QA matrix mínima
| Plataforma | Escenarios clave |
| --- | --- |
| Android | Safe areas (notch), ripple en botones, teclado sobre inputs, botón físico Back, accesibilidad con `fontScale` 1.3–1.5. |
| iOS | Notch + StatusBar translúcido, gestos del sistema, safe areas en modales, permisos (notificaciones/cámara). |
| Web | Resize 375?768?1280, hover/focus/cursor en elementos interactivos, navegación por teclado, scroll y viewport PWA. |

Con estos cimientos puedes extender la arquitectura hacia features específicas (hábitos, mood, etc.) sin duplicar lógica de responsive ni estilos.
