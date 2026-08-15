import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraIcon } from '@/components/ui/icons';
import { accentGlow, alpha, color, radius, type } from '@/lib/theme';

/**
 * Labelled rather than icon-only, centred over a 150pt scrim so it never
 * collides with a card. The single lime element on the screen.
 */
export function CheckInFab({ onPress, label = 'Check in' }: { onPress: () => void; label?: string }) {
  return (
    <>
      <LinearGradient
        colors={['transparent', alpha(color.bg, 0.92)]}
        locations={[0, 0.45]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={styles.anchor} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
          }}
          style={({ pressed }) => [
            styles.fab,
            pressed && { backgroundColor: color.accentHi, transform: [{ scale: 0.96 }] },
          ]}
        >
          <CameraIcon size={20} stroke={color.onAccent} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    zIndex: 8,
  },
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: 'center',
    zIndex: 10,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingLeft: 20,
    paddingRight: 26,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    ...accentGlow,
  },
  label: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
});
