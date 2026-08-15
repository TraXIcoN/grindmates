import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { TierDot } from '@/components/ui/TierDot';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { alpha, color, tierColor, tierFlavour, tierLabel, type } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

const TIERS: EffortLevel[] = [1, 2, 3];

interface Props {
  muscle: MuscleGroup | null;
  current?: EffortLevel;
  onPick: (tier: EffortLevel | null) => void;
  onClose: () => void;
}

/** Opens on select. Three tier buttons plus a clear. */
export function EffortSheet({ muscle, current, onPick, onClose }: Props) {
  return (
    <Sheet open={!!muscle} onClose={onClose} bottomPad={40}>
      <Text style={styles.title}>{muscle ? MUSCLE_LABEL[muscle] : ''}</Text>
      <Text style={styles.sub}>How hard did you go?</Text>

      <View style={styles.tiers}>
        {TIERS.map((tier) => (
          <EffortTierButton
            key={tier}
            tier={tier}
            selected={current === tier}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPick(tier);
            }}
          />
        ))}
      </View>

      {current ? (
        <Pressable onPress={() => onPick(null)} style={styles.clear} hitSlop={10}>
          <Text style={styles.clearText}>Remove this group</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

export function EffortTierButton({
  tier,
  selected,
  onPress,
}: {
  tier: EffortLevel;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = tierColor[tier];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tier,
        {
          backgroundColor: selected ? alpha(tint, 0.16) : pressed ? color.surfaceHi : color.surface,
          borderColor: selected ? tint : 'transparent',
        },
      ]}
    >
      <TierDot tier={tier} size={9} />
      <Text style={[styles.tierLabel, { color: selected ? tint : color.text }]}>
        {tierLabel[tier]}
      </Text>
      <Text style={styles.tierFlavour}>{tierFlavour[tier]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: type.sheetTitle.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: color.text,
  },
  sub: { fontSize: 13.5, color: color.muted, marginTop: 5 },
  tiers: { flexDirection: 'column', gap: 10, marginTop: 18 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  tierLabel: { fontSize: 14.5, fontWeight: '700', flex: 1 },
  tierFlavour: { fontSize: 12.5, fontWeight: '600', color: color.muted },
  clear: { marginTop: 14, alignSelf: 'center' },
  clearText: { fontSize: 13, fontWeight: '700', color: color.textFaint },
});
