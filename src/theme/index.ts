import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ColorScheme } from './colors';

const ThemeContext = createContext<ColorScheme>(Colors.light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return React.createElement(ThemeContext.Provider, { value: colors }, children);
}

export function useTheme(): ColorScheme {
  return useContext(ThemeContext);
}
