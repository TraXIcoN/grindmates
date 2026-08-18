import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useApp } from '@/hooks/useApp';
import { color } from '@/lib/theme';

/**
 * Launch gate. Renders a bare ground-coloured view for the one frame it takes
 * to read the persisted session — no spinner, no splash flash.
 */
export default function Index() {
  const { session, booting } = useApp();

  if (booting) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  // Signed in? Open like Snapchat: straight into the camera. The chevron on
  // the camera drops into the feed; a reload on any other URL stays put.
  return <Redirect href={session ? '/(app)/camera' : '/(auth)/sign-in'} />;
}
