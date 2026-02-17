
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/services/LocationTask';
import HomeScreen from './src/screens/HomeScreen';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    error: '#B00020',
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
