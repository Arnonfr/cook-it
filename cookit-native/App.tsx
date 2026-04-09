import React, { useEffect, useState } from 'react';
import { I18nManager, View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  NotoSansHebrew_400Regular,
  NotoSansHebrew_500Medium,
  NotoSansHebrew_700Bold,
} from '@expo-google-fonts/noto-sans-hebrew';
import * as Updates from 'expo-updates';

import { RootNavigator } from './src/navigation/RootNavigator';

// Force RTL setup globally
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Reloading the app is required on some platforms when toggling RTL. 
  // We'll wrap it in a try/catch since expo-updates might not be configured.
  try {
    Updates.reloadAsync();
  } catch (e) {
    // Ignore error in development if expo-updates is missing
  }
}

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({
    'NotoSansHebrew-Regular': NotoSansHebrew_400Regular,
    'NotoSansHebrew-Medium': NotoSansHebrew_500Medium,
    'NotoSansHebrew-Bold': NotoSansHebrew_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f6d63" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7F6',
  },
});
