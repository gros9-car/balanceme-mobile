import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Dispara una pequeña vibración de éxito en dispositivos físicos
 * (no hace nada en la web) usando el módulo de haptics de Expo.
 */
export const vibrateSuccess = async () => {
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Prefijo de ruta de fichero sugerido según la plataforma,
 * útil para componer mensajes o pistas en la interfaz.
 */
export const filePathHint = Platform.select({
  ios: 'file://',
  android: 'content://',
  web: '',
});
