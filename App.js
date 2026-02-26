import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/services/LocationTask';
import HomeScreen from './src/screens/HomeScreen';

const theme = {
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

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeScreen />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
