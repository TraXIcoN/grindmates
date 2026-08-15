import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pause, Play, RotateCcw } from 'lucide-react-native';

import { accentGlow, color, layout, radius, type } from '@/lib/theme';

interface Props {
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  onNudge: (delta: number) => void;
}

/** ±15s nudges flanking a lime play/pause, with reset on the end. */
export function TransportRow({ running, onToggle, onReset, onNudge }: Props) {
  return (
    <View style={styles.row}>
      <NudgePill label="−15" onPress={() => onNudge(-15)} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={running ? 'Pause rest timer' : 'Start rest timer'}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.primary,
          pressed && { backgroundColor: color.accentHi, transform: [{ scale: 0.96 }] },
        ]}
      >
        {running ? (
          <Pause size={26} color={color.onAccent} fill={color.onAccent} />
        ) : (
          <Play size={26} color={color.onAccent} fill={color.onAccent} />
        )}
      </Pressable>

      <NudgePill label="+15" onPress={() => onNudge(15)} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset rest timer"
        onPress={onReset}
        hitSlop={10}
        style={({ pressed }) => [styles.ghost, pressed && { backgroundColor: color.surfaceHi }]}
      >
        <RotateCcw size={18} color={color.textTertiary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function NudgePill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} seconds`}
      hitSlop={(layout.minTouch - layout.pillHeight) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.nudge, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <Text style={styles.nudgeText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nudge: {
    minWidth: 62,
    minHeight: layout.pillHeight,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: {
    fontSize: type.pill.fontSize,
    fontWeight: '700',
    color: color.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  primary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ghost: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
