import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const useResponsiveLayout = (options = {}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const {
    horizontalFactor = 0.05,
    verticalFactor = 0.06,
    minHorizontalPadding = 16,
    maxHorizontalPadding = 32,
    minVerticalPadding = 24,
    maxVerticalPadding = 48,
    contentWidthFactor = 0.95,
    tabletContentWidth = 520,
    phoneContentWidth = 420,
    maxContentWidth: providedMaxContentWidth,
  } = options;

  const horizontalPadding = Math.max(
    minHorizontalPadding,
    Math.min(maxHorizontalPadding, width * horizontalFactor),
  );

  const verticalPadding = Math.max(
    minVerticalPadding,
    Math.min(maxVerticalPadding, height * verticalFactor),
  );

  const baseMaxWidth = providedMaxContentWidth ?? (isTablet ? tabletContentWidth : phoneContentWidth);
  const maxContentWidth = Math.min(baseMaxWidth, width * contentWidthFactor);

  const keyboardVerticalOffset = Platform.select({
    ios: insets.top + 40,
    android: 0,
    default: 0,
  });

  const baseFont = isTablet ? 18 : isSmall ? 14 : 16;
  const fontScale = baseFont / 16;

  const fonts = {
    xs: Math.round(12 * fontScale),
    sm: Math.round(14 * fontScale),
    md: Math.round(16 * fontScale),
    lg: Math.round(20 * fontScale),
    xl: Math.round(24 * fontScale),
  };

  return {
    width,
    height,
    isSmall,
    isTablet,
    horizontalPadding,
    verticalPadding,
    maxContentWidth,
    safeTop: insets.top,
    safeBottom: insets.bottom,
    keyboardVerticalOffset,
    fonts,
  };
};

export default useResponsiveLayout;
