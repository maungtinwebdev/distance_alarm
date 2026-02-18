import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme, BottomNavigation } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/services/LocationTask';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    error: '#B00020',
  },
};

const renderScene = BottomNavigation.SceneMap({
  home: HomeScreen,
  transactions: TransactionsScreen,
});

export default function App() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home', focusedIcon: 'home', unfocusedIcon: 'home-outline'},
    { key: 'transactions', title: 'Transactions', focusedIcon: 'format-list-bulleted', unfocusedIcon: 'format-list-bulleted' },
  ]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <BottomNavigation
          navigationState={{ index, routes }}
          onIndexChange={setIndex}
          renderScene={renderScene}
        />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
