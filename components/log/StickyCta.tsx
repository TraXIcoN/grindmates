import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { accentGlow, alpha, color, radius, type } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  bottom?: number;
}

/** The one primary target on the screen. Nothing else competes for the thumb. */
export function StickyCta({ label, onPress, disabled, busy, bottom = 34 }: Props) {
  const inactive = disabled || busy;

  return (
    <>
      <LinearGradient
        colors={['transparent', alpha(color.bg, 0.92)]}
        locations={[0, 0.45]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={[styles.anchor, { bottom }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!inactive }}
          disabled={inactive}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
          }}
          style={({ pressed }) => [
            styles.cta,
            inactive && styles.ctaDisabled,
            pressed && !inactive && { backgroundColor: color.accentHi, transform: [{ scale: 0.98 }] },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={color.onAccent} size="small" />
          ) : (
            <Text style={[styles.label, inactive && { color: color.muted }]}>{label}</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, zIndex: 8 },
  anchor: { position: 'absolute', left: 20, right: 20, alignItems: 'stretch', zIndex: 10 },
  cta: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ctaDisabled: {
    backgroundColor: color.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
});
