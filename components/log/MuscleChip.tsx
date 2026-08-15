import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TierDot } from '@/components/ui/TierDot';
import { alpha, color, layout, radius, tierColor, tierFlavour } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

interface Props {
  muscle: MuscleGroup;
  label: string;
  tier?: EffortLevel;
  /** Tap cycles 1 -> 2 -> 3 -> off. Long-press opens the effort sheet. */
  onCycle: (muscle: MuscleGroup) => void;
  onLongPress: (muscle: MuscleGroup) => void;
}

/**
 * The list fallback for the body map. Untouched chips sit on surface; a tagged
 * chip takes its tier colour at 15% with a matching border and dot.
 */
export function MuscleChip({ muscle, label, tier, onCycle, onLongPress }: Props) {
  const tint = tier ? tierColor[tier] : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!tier }}
      accessibilityHint="Tap to cycle effort, hold to pick a tier"
      hitSlop={(layout.minTouch - layout.pillHeight) / 2}
      onPress={() => {
        void Haptics.selectionAsync();
        onCycle(muscle);
      }}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(muscle);
      }}
      delayLongPress={220}
      style={({ pressed }) => [
        styles.chip,
        tint
          ? { backgroundColor: alpha(tint, 0.15), borderColor: alpha(tint, 0.4) }
          : {
              backgroundColor: pressed ? color.surfaceHi : color.surface,
              borderColor: 'transparent',
            },
      ]}
    >
      {tier ? <TierDot tier={tier} /> : <View style={styles.emptyDot} />}
      <Text style={[styles.label, { color: tint ?? color.textTertiary }]}>{label}</Text>
      {tier ? <Text style={[styles.flavour, { color: tint! }]}>{tierFlavour[tier]}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: layout.pillHeight,
  },
  emptyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.slate600,
  },
  label: { fontSize: 13, fontWeight: '700' },
  flavour: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
});
