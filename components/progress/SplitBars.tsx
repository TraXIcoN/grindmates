import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MUSCLE_LABEL } from '@/lib/muscles';
import type { SplitRow } from '@/lib/stats';
import { alpha, color } from '@/lib/theme';

interface Props {
  rows: SplitRow[];
}

/**
 * Effort-weighted muscle distribution, last 30 days. Magnitude by category:
 * identity comes from the row label, so every bar wears the one accent hue —
 * no per-muscle rainbow. Values sit in text tokens beside the bars.
 */
export function SplitBars({ rows }: Props) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>Tag muscles on your check-ins and the split builds itself.</Text>;
  }

  const max = rows[0].score;

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.muscle} style={styles.row}>
          <Text style={styles.label}>{MUSCLE_LABEL[row.muscle]}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max(4, (row.score / max) * 100)}%`,
                  backgroundColor: alpha(color.accent, 0.75),
                },
              ]}
            />
          </View>
          <Text style={styles.value}>{row.score}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 84, fontSize: 12, fontWeight: '700', color: color.textSecondary },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.surface, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  value: {
    width: 26,
    fontSize: 11.5,
    fontWeight: '700',
    color: color.muted,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  empty: { fontSize: 13, fontWeight: '500', color: color.muted, lineHeight: 19 },
});
