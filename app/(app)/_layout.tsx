import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useApp } from '@/hooks/useApp';
import { color } from '@/lib/theme';

export default function AppLayout() {
  const { session, booting } = useApp();

  if (booting) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="camera" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="log" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="session" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="routine-edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="tools" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="timer"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack>
  );
}
