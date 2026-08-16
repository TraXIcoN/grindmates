import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildHeatmap, type HeatDay } from '@/lib/stats';
import type { HistoryItem } from '@/lib/api';
import { alpha, border, color } from '@/lib/theme';

const CELL = 16;
const GAP = 3;

/**
 * Sequential intensity — one hue, stepped light→dark by strain, which is the
 * correct encoding for magnitude. Level 0 is the bare surface with a faint
 * border so "nothing" and "a light day" stay distinguishable.
 */
const LEVEL_FILL = [
  color.surface,
  alpha(color.accent, 0.28),
  alpha(color.accent, 0.5),
  alpha(color.accent, 0.75),
  color.accent,
] as const;

const DOW = ['M', '', 'W', '', 'F', '', ''];

interface Props {
  items: HistoryItem[];
  weeks?: number;
}

/** GitHub-style activity grid with a tap-for-detail line underneath. */
export function Heatmap({ items, weeks = 16 }: Props) {
  const grid = useMemo(() => buildHeatmap(items, weeks), [items, weeks]);
  const [picked, setPicked] = useState<HeatDay | null>(null);

  return (
    <View>
      <View style={styles.gridRow}>
        <View style={styles.dowCol}>
          {DOW.map((d, i) => (
            <Text key={i} style={styles.dowLabel}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day) => (
                <Pressable
                  key={day.key}
                  disabled={day.future}
                  accessibilityLabel={`${day.key}: ${day.count} check-in${day.count === 1 ? '' : 's'}`}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setPicked((prev) => (prev?.key === day.key ? null : day));
                  }}
                  style={[
                    styles.cell,
                    { backgroundColor: day.future ? 'transparent' : LEVEL_FILL[day.level] },
                    day.level === 0 && !day.future ? styles.cellEmpty : null,
                    picked?.key === day.key ? styles.cellPicked : null,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend: the sequential scale itself, labeled at the ends. */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {LEVEL_FILL.map((fill, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: fill }, i === 0 && styles.cellEmpty]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>

      {picked ? (
        <View style={styles.detail}>
          <Text style={styles.detailDate}>
            {picked.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.detailBody}>
            {picked.count === 0
              ? 'No check-in.'
              : `${picked.count} check-in${picked.count === 1 ? '' : 's'}` +
                (picked.bestStrain > 0 ? ` · strain ${picked.bestStrain.toFixed(1)}` : '') +
                (picked.label ? ` · ${picked.label}` : '')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { flexDirection: 'row', gap: 6 },
  dowCol: { justifyContent: 'space-between', paddingVertical: 1 },
  dowLabel: {
    height: CELL,
    fontSize: 8,
    fontWeight: '700',
    color: color.textFaint,
    textAlignVertical: 'center',
    lineHeight: CELL,
  },
  grid: { flexDirection: 'row', gap: GAP, flex: 1, justifyContent: 'flex-end' },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 4 },
  cellEmpty: { borderWidth: 1, borderColor: border.faint },
  cellPicked: { borderWidth: 1.5, borderColor: color.text },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '600', color: color.textFaint, marginHorizontal: 3 },

  detail: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: border.faint,
  },
  detailDate: { fontSize: 12, fontWeight: '800', color: color.text },
  detailBody: { flex: 1, fontSize: 12, fontWeight: '600', color: color.muted },
});
