import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatClock } from '@/hooks/useRestTimer';
import { alpha, color, type } from '@/lib/theme';

const R = 54;
/** 2πr — the same 339 the design's `ringdraw` keyframe animates. */
const CIRCUMFERENCE = 2 * Math.PI * R;

interface Props {
  remaining: number;
  progress: number;
  running: boolean;
  size?: number;
}

/**
 * Countdown arc + 44·900 display. The arc runs lime while counting and flips
 * to tier-3 red under ten seconds, so the last stretch reads without looking.
 */
export function CountdownDial({ remaining, progress, running, size = 168 }: Props) {
  const stroke = remaining <= 10 && remaining > 0 ? color.tier3 : color.accent;
  const viewport = (R + 8) * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewport} ${viewport}`} style={styles.ring}>
        <Circle
          cx={viewport / 2}
          cy={viewport / 2}
          r={R}
          stroke={alpha(color.textTertiary, 0.14)}
          strokeWidth={7}
          fill="none"
        />
        <Circle
          cx={viewport / 2}
          cy={viewport / 2}
          r={R}
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.clock}>{formatClock(remaining)}</Text>
        <Text style={styles.state}>
          {remaining === 0 ? 'DONE' : running ? 'RESTING' : 'READY'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // -90deg so the arc starts at twelve o'clock.
  ring: { transform: [{ rotate: '-90deg' }] },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  clock: {
    fontSize: type.display.fontSize,
    fontWeight: '900',
    letterSpacing: -1.76,
    lineHeight: 46,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  state: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: color.muted,
  },
});
