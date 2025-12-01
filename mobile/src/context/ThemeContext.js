import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

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
  background: '#0a0a0a',          
  surface: 'rgba(20, 20, 20, 0.95)', 
  primary: '#bb86fc',             
  primaryContrast: '#ffffff',     
  text: '#f5f5f5',                
  subText: '#b8b8d9',            
  muted: '#1a1a1a',              
  accent: '#9d8df1',              
  danger: '#ff6b81',             
  outline: '#2f2f2f',             
  statusBarStyle: 'light-content',
};



const paletteByMode = {
  light: lightPalette,
  dark: darkPalette,
};

// Arma el tema de React Navigation reutilizando la paleta definida para el modo actual.
const createNavigationTheme = (mode, palette) => {
  const base = mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.muted,
      notification: palette.accent,
    },
  };
};

/**
 * Proveedor de tema de la aplicación.
 *
 * Sincroniza la preferencia de tema del usuario con el modo del sistema,
 * calcula la paleta de colores y construye el tema para React Navigation,
 * compartiéndolos a través de un contexto React.
 */
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

/**
 * Hook para acceder a los colores, tema actual y `navigationTheme`.
 * Lanza un error si se usa fuera de `ThemeProvider`.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};
