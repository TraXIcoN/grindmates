import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/boot/BootScreen';
import { AppProvider, useApp } from '@/hooks/useApp';
import { color } from '@/lib/theme';

/** Loader stays up at least this long — the brand moment plays out fully. */
const BOOT_MIN_MS = 2500;
/** Matches the BootScreen fade duration, plus a frame of slack. */
const BOOT_FADE_MS = 420;

/**
 * Holds the animated boot loader over the app until BOTH the minimum brand
 * beat has played and the persisted session has hydrated, then fades it out
 * and unmounts it entirely.
 */
function BootGate({ children }: { children: ReactNode }) {
  const { booting } = useApp();
  const [minElapsed, setMinElapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), BOOT_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (minElapsed && !booting) setFading(true);
  }, [minElapsed, booting]);

  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => setGone(true), BOOT_FADE_MS);
    return () => clearTimeout(t);
  }, [fading]);

  return (
    <>
      {children}
      {!gone && <BootScreen fading={fading} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <AppProvider>
          <BootGate>
          <Head>
            <title>Grindmates</title>
          </Head>
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
          </BootGate>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
