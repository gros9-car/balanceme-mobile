import { Alert, Linking } from 'react-native';

const DEFAULT_EMERGENCY_NUMBER = '131';

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

