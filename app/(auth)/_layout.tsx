import { Stack } from 'expo-router';
import React from 'react';

import { color } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
        animation: 'fade',
      }}
    />
  );
}
