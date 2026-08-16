import { Tabs } from 'expo-router';
import React from 'react';
import { BarChart3, BookOpen, Dumbbell, Home, Settings } from 'lucide-react-native';

import { border, color } from '@/lib/theme';

/**
 * The five rooms of the app. The tab bar sits on bgRaised with a hairline —
 * no floating pill, no blur; icons take accent only when active, so the bar
 * never competes with the screen's single lime action.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.bgRaised,
          borderTopWidth: 1,
          borderTopColor: border.faint,
          height: 62,
          paddingTop: 6,
        },
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: tint }) => <Home size={20} color={tint} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ color: tint }) => <Dumbbell size={20} color={tint} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color: tint }) => <BookOpen size={20} color={tint} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color: tint }) => <BarChart3 size={20} color={tint} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color: tint }) => <Settings size={20} color={tint} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
