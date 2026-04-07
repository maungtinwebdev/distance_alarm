import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/services/LocationTask';
import HomeScreen from './src/screens/HomeScreen';
import { PALETTE } from './src/theme/colors';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2B8AFF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0EEFF',
    onPrimaryContainer: '#001F4D',
    secondary: '#43A047',
    secondaryContainer: '#E0F2E1',
    tertiary: '#FF9800',
    error: '#D32F2F',
    errorContainer: '#FFE0E0',
    surface: '#FFFFFF',
    surfaceVariant: '#EEF1F6',
    onSurface: '#151A26',
    onSurfaceVariant: '#5A6478',
    background: '#F5F7FA',
    outline: '#A0AAB8',
    outlineVariant: '#DEE2E8',
    inverseSurface: '#262E3E',
    inverseOnSurface: '#F0F2F5',
    elevation: {
      level0: 'transparent',
      level1: '#F8FAFC',
      level2: '#F0F3F7',
      level3: '#E8ECF2',
      level4: '#E2E7EE',
      level5: '#DEE3EB',
    },
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4DA6FF',
    onPrimary: '#001F4D',
    primaryContainer: '#0D3B7A',
    onPrimaryContainer: '#CCE5FF',
    secondary: '#66BB6A',
    secondaryContainer: '#1B5E20',
    tertiary: '#FFB74D',
    error: '#EF5350',
    errorContainer: '#5C1111',
    surface: '#1A2030',
    surfaceVariant: '#262E3E',
    onSurface: '#E8ECF2',
    onSurfaceVariant: '#A0AAB8',
    background: '#0E1219',
    outline: '#5A6478',
    outlineVariant: '#3D4558',
    inverseSurface: '#E8ECF2',
    inverseOnSurface: '#262E3E',
    elevation: {
      level0: 'transparent',
      level1: '#1A2030',
      level2: '#1E2538',
      level3: '#222A3E',
      level4: '#262F44',
      level5: '#2A3349',
    },
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
