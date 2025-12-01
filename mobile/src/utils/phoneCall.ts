import { Alert, Linking } from 'react-native';

const DEFAULT_EMERGENCY_NUMBER = '131';

/**
 * Intenta abrir la aplicación de teléfono del dispositivo para llamar
 * a un número dado o, si falta, a un número de emergencia por defecto.
 *
 * Muestra alertas de error en caso de que el dispositivo no soporte
 * la acción o ocurra una excepción.
 *
 * @param phoneNumber Número al que se quiere llamar.
 */
export async function makePhoneCall(phoneNumber?: string) {
  const sanitizedNumber = (phoneNumber || DEFAULT_EMERGENCY_NUMBER).trim();
  const url = `tel:${sanitizedNumber}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        'No se puede realizar la llamada',
        'Tu dispositivo no permite abrir la app de teléfono.',
      );
      return;
    }

    await Linking.openURL(url);
  } catch (error: any) {
    Alert.alert(
      'Error al realizar la llamada',
      error?.message || 'Ha ocurrido un error inesperado.',
    );
  }
}
