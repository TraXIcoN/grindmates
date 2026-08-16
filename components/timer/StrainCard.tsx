import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { alpha, border, color, radius, tierColor } from '@/lib/theme';

const R = 34;
const ARC = 2 * Math.PI * R;
/** The arc leaves a gap at the bottom, so it reads as a gauge, not a ring. */
const SWEEP = 0.78;

/** 0–21 strain arc. Lime under 10, amber to 16, red above. */
export function StrainRing({ value, size = 92 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(21, value));
  const pct = clamped / 21;
  const tint = clamped >= 16 ? tierColor[3] : clamped >= 10 ? tierColor[2] : color.accent;
  const viewport = (R + 8) * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewport} ${viewport}`} style={styles.rotate}>
        <Circle
          cx={viewport / 2}
          cy={viewport / 2}
          r={R}
          stroke={alpha(color.textTertiary, 0.14)}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${ARC * SWEEP} ${ARC}`}
        />
        <Circle
          cx={viewport / 2}
          cy={viewport / 2}
          r={R}
          stroke={tint}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${ARC * SWEEP * pct} ${ARC}`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: tint }]}>{clamped.toFixed(1)}</Text>
        <Text style={styles.unit}>STRAIN</Text>
      </View>
    </View>
  );
}

interface CardProps {
  strain: number;
  sets: number;
  /** Total logged reps across the session; null hides the stat entirely. */
  totalReps?: number | null;
  totalRestSeconds: number;
}

export function StrainCard({ strain, sets, totalReps, totalRestSeconds }: CardProps) {
  const mins = Math.floor(totalRestSeconds / 60);
  const secs = totalRestSeconds % 60;

  return (
    <View style={styles.card}>
      <StrainRing value={strain} />
      <View style={styles.stats}>
        <Stat label="SETS" value={String(sets)} />
        {totalReps != null ? <Stat label="TOTAL REPS" value={String(totalReps)} /> : null}
        <Stat label="UNDER REST" value={`${mins}m ${String(secs).padStart(2, '0')}s`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Start the gauge at the bottom-left so the gap sits under the number.
  rotate: { transform: [{ rotate: '129deg' }] },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66 },
  unit: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.2, color: color.muted, marginTop: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  stats: { flex: 1, gap: 11 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: color.muted },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.34,
    color: color.text,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
});
