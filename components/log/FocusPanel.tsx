import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EXERCISES } from '@/lib/exercises';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { alpha, border, color, tierColor, tierLabel, type } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

const TIERS: EffortLevel[] = [1, 2, 3];

interface Props {
  muscle: MuscleGroup;
  tier?: EffortLevel;
  /** The current note text — chips read their selected state out of it. */
  caption: string;
  onTier: (tier: EffortLevel | undefined) => void;
  onToggleExercise: (name: string) => void;
  onDismiss: () => void;
}

/**
 * Lives under the zoomed body map: effort tiers for the focused muscle, then
 * exercise suggestions that tag straight into the note. One quick fade on
 * mount — the zoom above it is the only movement.
 */
export function FocusPanel({ muscle, tier, caption, onTier, onToggleExercise, onDismiss }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(160)} style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>{MUSCLE_LABEL[muscle]}</Text>
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel="Show full body">
          <Text style={styles.dismiss}>Full body</Text>
        </Pressable>
      </View>

      <View style={styles.tiers}>
        {TIERS.map((t) => {
          const tint = tierColor[t];
          const on = tier === t;
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Tapping the active tier clears it — same cycle-off affordance
                // as the chips below the map.
                onTier(on ? undefined : t);
              }}
              style={({ pressed }) => [
                styles.tierChip,
                on
                  ? { backgroundColor: alpha(tint, 0.15), borderColor: alpha(tint, 0.4) }
                  : {
                      backgroundColor: pressed ? color.surfaceHi : color.surface,
                      borderColor: 'transparent',
                    },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: tint }]} />
              <Text style={[styles.tierText, { color: on ? tint : color.textTertiary }]}>
                {tierLabel[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>EXERCISES</Text>
      <View style={styles.exercises}>
        {EXERCISES[muscle].map((name) => {
          const on = caption.includes(name);
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityHint="Adds this exercise to your note"
              onPress={() => onToggleExercise(name)}
              style={({ pressed }) => [
                styles.exChip,
                on
                  ? { backgroundColor: alpha(color.accent, 0.13), borderColor: alpha(color.accent, 0.38) }
                  : {
                      backgroundColor: pressed ? color.surfaceHi : color.surface,
                      borderColor: 'transparent',
                    },
              ]}
            >
              <Text style={[styles.exText, { color: on ? color.accent : color.textSecondary }]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: border.faint,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.32, color: color.text },
  dismiss: { fontSize: 12, fontWeight: '700', color: color.muted },

  tiers: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tierChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  tierText: { fontSize: 13, fontWeight: '700' },

  sectionLabel: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },
  exercises: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exChip: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
  },
  exText: { fontSize: 12.5, fontWeight: '600' },
});
