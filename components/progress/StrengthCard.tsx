import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { alpha, color, radius, toggleTint } from '@/lib/theme';
import { strengthCurve, trackedExercises } from '@/lib/workout';

const CHART_W = 300;
const CHART_H = 84;

/**
 * Estimated 1RM over time, per exercise, from the session log's own sets —
 * the strength curve. One 2px series, latest value directly labeled, no
 * legend needed (the chip names the series).
 */
export function StrengthCard() {
  const exercises = useMemo(() => trackedExercises(), []);
  const [picked, setPicked] = useState<string | null>(exercises[0] ?? null);

  const points = useMemo(() => (picked ? strengthCurve(picked) : []), [picked]);

  const line = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.est1rm);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const coords = points.map((p, i) => ({
      x: (i / (points.length - 1)) * (CHART_W - 40) + 6,
      y: CHART_H - 10 - ((p.est1rm - min) / span) * (CHART_H - 22),
    }));
    return { coords, path: coords.map((c) => `${c.x},${c.y}`).join(' ') };
  }, [points]);

  if (exercises.length === 0) {
    return (
      <Text style={styles.empty}>
        Log weighted sets in a session — each exercise builds its own strength curve here.
      </Text>
    );
  }

  const latest = points[points.length - 1];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {exercises.slice(0, 8).map((name) => {
          const on = picked === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.selectionAsync();
                setPicked(name);
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && { color: color.accent }]}>{name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {points.length === 0 ? (
        <Text style={styles.empty}>No weighted sets for this one yet.</Text>
      ) : points.length === 1 ? (
        <View style={styles.single}>
          <Text style={styles.value}>{points[0].est1rm.toFixed(1)}</Text>
          <Text style={styles.meta}>kg est. 1RM · one session so far — the curve starts at two</Text>
        </View>
      ) : (
        <View style={styles.chartRow}>
          <Svg width={CHART_W} height={CHART_H}>
            <Polyline
              points={line!.path}
              fill="none"
              stroke={color.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {line!.coords.map((c, i) => (
              <Circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === line!.coords.length - 1 ? 3.5 : 2}
                fill={i === line!.coords.length - 1 ? color.accent : alpha(color.accent, 0.55)}
              />
            ))}
          </Svg>
          <View style={styles.latest}>
            <Text style={styles.value}>{latest.est1rm.toFixed(1)}</Text>
            <Text style={styles.unit}>kg est. 1RM</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 7, paddingBottom: 12 },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: toggleTint(color.accent),
  chipText: { fontSize: 11.5, fontWeight: '700', color: color.textTertiary },

  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  latest: { alignItems: 'flex-end', flex: 1 },
  single: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6, color: color.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 10, fontWeight: '700', color: color.muted },
  meta: { fontSize: 11.5, fontWeight: '500', color: color.muted, flexShrink: 1 },
  empty: { fontSize: 13, fontWeight: '500', lineHeight: 19, color: color.muted },
});
