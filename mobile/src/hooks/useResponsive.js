import { useWindowDimensions } from 'react-native';

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
