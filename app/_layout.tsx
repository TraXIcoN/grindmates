import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/hooks/useApp';
import { color } from '@/lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.bg },
              animation: 'fade',
              animationDuration: 160,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
