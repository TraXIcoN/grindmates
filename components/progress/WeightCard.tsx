import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import Svg, { Circle as SvgCircle, Polyline } from 'react-native-svg';

import type { WeightEntry } from '@/lib/api';
import { color } from '@/lib/theme';

const CHART_W = 160;
const CHART_H = 44;

interface Props {
  entries: WeightEntry[];
  busy: boolean;
  onLog: (kg: number) => void;
}

/**
 * Bodyweight, tracked privately. Current value is the direct label; the
 * sparkline is a single 2px series (one series — no legend, per the rules),
 * with a dot on the latest point.
 */
export function WeightCard({ entries, busy, onLog }: Props) {
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number>(latest?.kg ?? 75);

  const delta = useMemo(() => {
    if (entries.length < 2) return null;
    return Math.round((entries[entries.length - 1].kg - entries[0].kg) * 10) / 10;
  }, [entries]);

  const line = useMemo(() => {
    if (entries.length < 2) return null;
    const kgs = entries.map((e) => e.kg);
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    const span = Math.max(0.5, max - min);
    const points = entries.map((e, i) => {
      const x = (i / (entries.length - 1)) * (CHART_W - 6) + 3;
      const y = CHART_H - 5 - ((e.kg - min) / span) * (CHART_H - 10);
      return { x, y };
    });
    return { points, path: points.map((p) => `${p.x},${p.y}`).join(' ') };
  }, [entries]);

  const step = (d: number) => {
    void Haptics.selectionAsync();
    setDraft((v) => Math.round(Math.max(30, Math.min(300, v + d)) * 10) / 10);
  };

  return (
    <View>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.value}>
            {latest ? latest.kg.toFixed(1) : '—'}
            <Text style={styles.unit}> kg</Text>
          </Text>
          <Text style={styles.meta}>
            {latest
              ? delta !== null
                ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg since first log`
                : 'Logged once — keep going.'
              : 'Not logged yet.'}
          </Text>
        </View>

        {line ? (
          <Svg width={CHART_W} height={CHART_H}>
            <Polyline
              points={line.path}
              fill="none"
              stroke={color.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <SvgCircle
              cx={line.points[line.points.length - 1].x}
              cy={line.points[line.points.length - 1].y}
              r={3.5}
              fill={color.accent}
            />
          </Svg>
        ) : null}
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <StepBtn icon="minus" onPress={() => step(-0.5)} />
          <Text style={styles.draft}>{draft.toFixed(1)} kg</Text>
          <StepBtn icon="plus" onPress={() => step(0.5)} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              onLog(draft);
              setEditing(false);
            }}
            style={({ pressed }) => [styles.save, pressed && { backgroundColor: color.accentHi }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={color.onAccent} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(latest?.kg ?? 75);
            setEditing(true);
          }}
          style={({ pressed }) => [styles.logBtn, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Text style={styles.logBtnText}>{latest ? 'Log today' : 'Log your weight'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function StepBtn({ icon, onPress }: { icon: 'minus' | 'plus'; onPress: () => void }) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'Half a kilo less' : 'Half a kilo more'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <Icon size={13} color={color.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  value: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, color: color.text },
  unit: { fontSize: 13, fontWeight: '700', color: color.muted },
  meta: { marginTop: 2, fontSize: 12, fontWeight: '500', color: color.muted },

  logBtn: {
    marginTop: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { fontSize: 13, fontWeight: '700', color: color.textSecondary },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draft: {
    minWidth: 74,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  save: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 13.5, fontWeight: '800', color: color.onAccent },
});
