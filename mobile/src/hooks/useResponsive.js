import { useWindowDimensions } from 'react-native';

/**
 * Hook de ayuda para obtener información de tamaño de pantalla
 * y derivar flags (small/medium/large) junto con tamaños de fuente
 * y espaciados recomendados.
 *
 * @returns {{
 *   width: number,
 *   height: number,
 *   isSmall: boolean,
 *   isMedium: boolean,
 *   isLarge: boolean,
 *   spacing: number,
 *   font: { xs: number, sm: number, md: number, lg: number, xl: number }
 * }}
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 360;
  const isMedium = width >= 360 && width < 768;
  const isLarge = width >= 768;

  const baseSpacing = isSmall ? 8 : isMedium ? 12 : 16;

  const font = {
    xs: isSmall ? 10 : 12,
    sm: isSmall ? 12 : 14,
    md: isSmall ? 14 : 16,
    lg: isSmall ? 16 : 18,
    xl: isSmall ? 18 : 22,
  };

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    spacing: baseSpacing,
    font,
  };
}

export default useResponsive;
