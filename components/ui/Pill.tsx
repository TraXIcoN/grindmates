import * as Haptics from 'expo-haptics';
import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, color, layout, radius, type } from '@/lib/theme';

interface PillProps {
  children?: ReactNode;
  label?: string;
  /** Toggled state paints the pill in `tint` at 15% with a 33% border. */
  active?: boolean;
  /** The colour a pill takes when active. */
  tint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
}

/**
 * The base pill. Design spec:
 *   padding 9/14 · gap 7 · radius 999 · minHeight 40
 *   off  → bg surface, text textTertiary, transparent border
 *   on   → bg tint@15%, text tint, border tint@33%
 * hitSlop lifts the real tap target to the 44pt floor.
 */
export function Pill({
  children,
  label,
  active = false,
  tint = color.accent,
  onPress,
  style,
  disabled,
  haptic = true,
}: PillProps) {
  const [pressed, setPressed] = useState(false);

  const activeStyle: ViewStyle = {
    backgroundColor: alpha(tint, 0.15),
    borderColor: alpha(tint, 0.33),
  };
  const idleStyle: ViewStyle = {
    backgroundColor: pressed ? color.surfaceHi : color.surface,
    borderColor: 'transparent',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={(layout.minTouch - layout.pillHeight) / 2}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[styles.pill, active ? activeStyle : idleStyle, style]}
    >
      {children}
      {label ? (
        <Text style={[styles.label, { color: active ? tint : color.textTertiary }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

/** Colour a pill's contents should take for a given state. */
export function pillContentColor(active: boolean, tint: string): string {
  return active ? tint : color.textTertiary;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: layout.pillHeight,
  },
  label: {
    fontSize: type.pill.fontSize,
    fontWeight: type.pill.fontWeight,
  },
});

/** A dot with a matching glow — the tier marker used on muscle tags. */
export function GlowDot({ tint, size = 7 }: { tint: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint,
        shadowColor: tint,
        shadowOpacity: 1,
        shadowRadius: size * 1.15,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
      }}
    />
  );
}
