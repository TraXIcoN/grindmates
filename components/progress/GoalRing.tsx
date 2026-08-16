import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';

import { alpha, color } from '@/lib/theme';

const R = 34;
const ARC = 2 * Math.PI * R;

interface Props {
  done: number;
  goal: number;
  onGoal: (next: number) => void;
}

/**
 * Check-ins this week against a personal target. The ring closes as the week
 * fills; hitting the goal flips the number to accent. Goal is adjustable in
 * place (2–7 days) — a preference, not a shared value.
 */
export function GoalRing({ done, goal, onGoal }: Props) {
  const pct = Math.min(1, goal > 0 ? done / goal : 0);
  const met = done >= goal;
  const viewport = (R + 7) * 2;

  const step = (delta: number) => {
    const next = Math.max(2, Math.min(7, goal + delta));
    if (next !== goal) {
      void Haptics.selectionAsync();
      onGoal(next);
    }
  };

  return (
    <View style={styles.row}>
      <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={92} height={92} viewBox={`0 0 ${viewport} ${viewport}`} style={styles.rotate}>
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
            stroke={color.accent}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={ARC}
            strokeDashoffset={ARC * (1 - pct)}
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.big, met && { color: color.accent }]}>
            {done}
            <Text style={styles.of}>/{goal}</Text>
          </Text>
          <Text style={styles.unit}>THIS WEEK</Text>
        </View>
      </View>

      <View style={styles.side}>
        <Text style={styles.title}>{met ? 'Goal hit. Keep the streak honest.' : 'Weekly goal'}</Text>
        <Text style={styles.sub}>
          {met
            ? `${done} check-in day${done === 1 ? '' : 's'} so far.`
            : `${goal - done} more day${goal - done === 1 ? '' : 's'} to hit ${goal}.`}
        </Text>
        <View style={styles.stepper}>
          <StepBtn icon="minus" disabled={goal <= 2} onPress={() => step(-1)} />
          <Text style={styles.goalValue}>{goal} days</Text>
          <StepBtn icon="plus" disabled={goal >= 7} onPress={() => step(1)} />
        </View>
      </View>
    </View>
  );
}

function StepBtn({
  icon,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'Lower weekly goal' : 'Raise weekly goal'}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.stepBtn,
        { opacity: disabled ? 0.35 : 1 },
        pressed && !disabled && { backgroundColor: color.surfaceHi },
      ]}
    >
      <Icon size={13} color={color.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, color: color.text },
  of: { fontSize: 13, fontWeight: '800', color: color.muted },
  unit: { marginTop: 1, fontSize: 8, fontWeight: '700', letterSpacing: 1.2, color: color.muted },

  side: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, color: color.text },
  sub: { marginTop: 3, fontSize: 12.5, fontWeight: '500', color: color.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: color.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
    textAlign: 'center',
  },
});
