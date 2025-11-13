import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { theme } from '../theme';
import { platformStyles } from '../theme/platform';

export const defaultScreenOptions: NativeStackNavigationOptions = {
  headerStyle: {
    backgroundColor: theme.color.bg,
    height: platformStyles?.headerHeight,
  },
  headerTintColor: theme.color.text,
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentStyle: { backgroundColor: theme.color.bg },
};
