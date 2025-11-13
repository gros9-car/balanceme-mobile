import { Platform } from 'react-native';

export const platformStyles = Platform.select({
  ios: { ripple: undefined, headerHeight: 52 },
  android: {
    ripple: { color: 'rgba(255,255,255,0.15)', borderless: false },
    headerHeight: 56,
  },
  web: {
    ripple: undefined,
    headerHeight: 60,
    cursor: 'pointer' as const,
  },
});
