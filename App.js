import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/services/LocationTask';
import HomeScreen from './src/screens/HomeScreen';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1f7ef0',
    onPrimary: '#ffffff',
    primaryContainer: '#d5e3ff',
    onPrimaryContainer: '#001a48',
    secondary: '#00bfa5',
    tertiary: '#ff6b6b',
    error: '#dc3545',
    surface: '#ffffff',
    onSurface: '#1a1a1a',
    background: '#f5f5f5',
    outline: '#999999',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4da6ff',
    onPrimary: '#001a48',
    primaryContainer: '#003d99',
    onPrimaryContainer: '#d5e3ff',
    secondary: '#00bfa5',
    tertiary: '#ff6b6b',
    error: '#ff5252',
    surface: '#1a1a1a',
    onSurface: '#ffffff',
    background: '#121212',
    outline: '#666666',
  },
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem('darkMode');
        if (savedMode !== null) {
          setIsDarkMode(savedMode === 'true');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <HomeScreen onThemeChange={setIsDarkMode} isDarkMode={isDarkMode} />
        <StatusBar style={isDarkMode ? "light" : "dark"} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
