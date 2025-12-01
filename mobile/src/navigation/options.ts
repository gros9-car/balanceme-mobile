import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { theme } from '../theme';
import { platformStyles } from '../theme/platform';

/**
 * Opciones por defecto para todas las pantallas del stack de navegación
 * (colores de fondo, altura de cabecera, estilos de título, etc.).
 */
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
