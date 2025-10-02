import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext(null);

const lightPalette = {
  background: '#f8fafc',
  surface: 'rgba(255, 255, 255, 0.9)',
  primary: '#8b5cf6',
  primaryContrast: '#ffffff',
  text: '#111827',
  subText: '#4b5563',
  muted: '#e5e7eb',
  accent: '#6366f1',
  danger: '#ef4444',
  outline: '#cbd5f5',
  statusBarStyle: 'dark-content',
};

const darkPalette = {
  background: '#0f172a',
  surface: 'rgba(15, 23, 42, 0.95)',
  primary: '#a855f7',
  primaryContrast: '#0f172a',
  text: '#f8fafc',
  subText: '#cbd5f5',
  muted: '#1e293b',
  accent: '#22d3ee',
  danger: '#f87171',
  outline: '#334155',
  statusBarStyle: 'light-content',
};

const paletteByMode = {
  light: lightPalette,
  dark: darkPalette,
};

const createNavigationTheme = (mode, palette) => ({
  dark: mode === 'dark',
  colors: {
    primary: palette.primary,
    background: palette.background,
    card: palette.surface,
    text: palette.text,
    border: palette.muted,
    notification: palette.accent,
  },
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme() ?? 'light';
  const [theme, setTheme] = useState('system');

  const effectiveTheme = theme === 'system' ? systemScheme : theme;
  const palette = paletteByMode[effectiveTheme] ?? lightPalette;

  const navigationTheme = useMemo(
    () => createNavigationTheme(effectiveTheme, palette),
    [effectiveTheme, palette],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      effectiveTheme,
      colors: palette,
      navigationTheme,
    }),
    [theme, palette, navigationTheme, effectiveTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};
