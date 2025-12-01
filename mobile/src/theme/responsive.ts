import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Puntos de corte de anchura usados para adaptar el layout
 * entre teléfono, tablet y escritorio.
 */
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isWeb = Platform.OS === 'web';

export const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
export const isDesktop = width >= breakpoints.desktop;

// Responsive typography helper based on a 375-width baseline
/**
 * Helper tipográfico que escala un tamaño base (definido para 375 px)
 * según el ancho real de la pantalla.
 */
export const ms = (size: number) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/**
 * Genera estilos de sombra coherentes entre plataformas
 * a partir de un nivel de intensidad (1-3).
 */
export const shadow = (level: 1 | 2 | 3 = 1) => {
  const presets = {
    1: { elevation: 2, radius: 4, opacity: 0.1 },
    2: { elevation: 4, radius: 8, opacity: 0.12 },
    3: { elevation: 8, radius: 16, opacity: 0.16 },
  } as const;

  const { elevation, radius, opacity } = presets[level];

  if (isAndroid) {
    return {
      elevation,
      backgroundColor: '#FFFFFF',
    };
  }

  if (isWeb) {
    return {
      boxShadow: `0px ${elevation}px ${radius * 2}px rgba(0,0,0,${opacity})`,
      backgroundColor: '#FFFFFF',
    } as const;
  }

  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: opacity,
    shadowRadius: radius,
    backgroundColor: '#FFFFFF',
  };
};

/**
 * Devuelve el número de columnas lógicas recomendado
 * según el tipo de dispositivo (4, 8 o 12).
 */
export const columns = () => {
  if (isDesktop) return 12;
  if (isTablet) return 8;
  return 4;
};
