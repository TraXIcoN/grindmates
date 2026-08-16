import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { alpha, color, radius } from '@/lib/theme';

/**
 * The spread covers real set patterns in one tap: an opener of 10–15, then
 * heavy follow-ups around 4. Fine-tuning beyond the presets is the ± pills.
 */
const PRESETS = [4, 6, 8, 10, 12, 15];

interface Props {
  /** null = not tracking reps for this set — reps are an option, not a demand. */
  value: number | null;
  onChange: (next: number | null) => void;
}

/**
 * Preset chips flanked by −/+ fine adjust. Tapping the active preset clears it
 * back to "no reps", so time-only lifters are never forced through a number.
 */
export function RepsPicker({ value, onChange }: Props) {
  const step = (delta: number) => {
    if (value === null) return;
    void Haptics.selectionAsync();
    onChange(Math.max(1, Math.min(99, value + delta)));
  };

  return (
    <View style={styles.row}>
      <StepPill
        icon="minus"
        disabled={value === null || value <= 1}
        onPress={() => step(-1)}
      />

      <View style={styles.presets}>
        {PRESETS.map((n) => {
          const on = value === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${n} reps`}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(on ? null : n);
              }}
              style={({ pressed }) => [
                styles.preset,
                on
                  ? { backgroundColor: alpha(color.accent, 0.15), borderColor: alpha(color.accent, 0.4) }
                  : {
                      backgroundColor: pressed ? color.surfaceHi : color.surface,
                      borderColor: 'transparent',
                    },
              ]}
            >
              <Text style={[styles.presetText, on && { color: color.accent }]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      <StepPill icon="plus" disabled={value === null || value >= 99} onPress={() => step(1)} />
    </View>
  );
}

function StepPill({
  icon,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'One rep fewer' : 'One rep more'}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.step,
        { opacity: disabled ? 0.35 : 1 },
        pressed && !disabled && { backgroundColor: color.surfaceHi },
      ]}
    >
      <Icon size={14} color={color.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  preset: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: color.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
