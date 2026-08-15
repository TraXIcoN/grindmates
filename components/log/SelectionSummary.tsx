import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TierDot } from '@/components/ui/TierDot';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { strainFrom } from '@/lib/api';
import { border, color, radius } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

interface Props {
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
}

/** What you're about to post, in one line, plus the strain it works out to. */
export function SelectionSummary({ effort }: Props) {
  const entries = Object.entries(effort) as Array<[MuscleGroup, EffortLevel]>;

  if (entries.length === 0) {
    return (
      <View style={[styles.box, styles.empty]}>
        <Text style={styles.emptyText}>Tap a region or a chip to tag what you hit.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.tags}>
        {entries.map(([muscle, tier]) => (
          <View key={muscle} style={styles.tag}>
            <TierDot tier={tier} size={6} />
            <Text style={styles.tagText}>{MUSCLE_LABEL[muscle]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.strain}>
        <Text style={styles.strainValue}>{strainFrom(effort).toFixed(1)}</Text>
        <Text style={styles.strainUnit}>/ 21</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  empty: { justifyContent: 'center' },
  emptyText: { fontSize: 13, fontWeight: '500', color: color.muted },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText: { fontSize: 12.5, fontWeight: '700', color: color.textSecondary },
  strain: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  strainValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: color.accent },
  strainUnit: { fontSize: 11, fontWeight: '700', color: color.muted },
});
