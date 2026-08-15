import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alpha, color, layout, radius, type } from '@/lib/theme';
import type { SetType } from '@/lib/types';

const OPTIONS: Array<{ key: SetType; label: string; tint: string }> = [
  { key: 'warmup', label: 'Warmup', tint: color.tier1 },
  { key: 'working', label: 'Working', tint: color.accent },
  { key: 'drop', label: 'Drop Set', tint: color.tier2 },
  { key: 'failure', label: 'Failure', tint: color.tier3 },
];

/** Four toggle chips. Quick tags for what the timer is resting between. */
export function SetTypeSelector({
  value,
  onChange,
}: {
  value: SetType;
  onChange: (next: SetType) => void;
}) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => (
        <ToggleChip
          key={opt.key}
          label={opt.label}
          tint={opt.tint}
          active={value === opt.key}
          onPress={() => {
            void Haptics.selectionAsync();
            onChange(opt.key);
          }}
        />
      ))}
    </View>
  );
}

export function ToggleChip({
  label,
  tint,
  active,
  onPress,
}: {
  label: string;
  tint: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={(layout.minTouch - 36) / 2}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: alpha(tint, 0.15), borderColor: alpha(tint, 0.4) }
          : {
              backgroundColor: pressed ? color.surfaceHi : color.surface,
              borderColor: 'transparent',
            },
      ]}
    >
      <Text style={[styles.label, { color: active ? tint : color.textTertiary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: type.pill.fontSize, fontWeight: '700' },
});
