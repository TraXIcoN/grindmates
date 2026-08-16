import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, tierColor } from '@/lib/theme';
import type { SetType } from '@/lib/types';

export interface LoggedSet {
  type: SetType;
  /** null = the lifter rested without counting reps. */
  reps: number | null;
  /** null = no load tracked for this set. */
  weight: number | null;
}

const TYPE_GLYPH: Record<SetType, { letter: string; tint: string }> = {
  warmup: { letter: 'W', tint: tierColor[1] },
  working: { letter: 'S', tint: color.accent },
  drop: { letter: 'D', tint: tierColor[2] },
  failure: { letter: 'F', tint: tierColor[3] },
};

interface Props {
  sets: LoggedSet[];
  /** Long-press a tile to remove that set — mislogs happen mid-workout. */
  onRemove: (index: number) => void;
}

/**
 * The session so far, one small tile per set: index, type letter in its tint,
 * reps (or an em dash for untracked). Horizontal scroll past six or so.
 */
export function SetLogList({ sets, onRemove }: Props) {
  if (sets.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {sets.map((set, i) => {
        const glyph = TYPE_GLYPH[set.type];
        return (
          <Pressable
            key={`${i}-${set.type}-${set.reps ?? 'x'}`}
            accessibilityLabel={`Set ${i + 1}, ${set.type}, ${set.reps ?? 'no'} reps. Hold to remove.`}
            onLongPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRemove(i);
            }}
            delayLongPress={300}
            style={styles.tile}
          >
            <Text style={styles.index}>{i + 1}</Text>
            <Text style={[styles.letter, { color: glyph.tint }]}>{glyph.letter}</Text>
            <Text style={styles.reps}>{set.reps ?? '—'}</Text>
            {set.weight !== null ? <Text style={styles.weight}>{set.weight} kg</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  tile: {
    alignItems: 'center',
    gap: 2,
    minWidth: 46,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: color.surface,
  },
  index: { fontSize: 9, fontWeight: '700', color: color.textFaint },
  letter: { fontSize: 11, fontWeight: '900' },
  reps: {
    fontSize: 14,
    fontWeight: '800',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  weight: {
    fontSize: 9.5,
    fontWeight: '700',
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
});
