import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const vibrateSuccess = async () => {
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

export const filePathHint = Platform.select({
  ios: 'file://',
  android: 'content://',
  web: '',
});
