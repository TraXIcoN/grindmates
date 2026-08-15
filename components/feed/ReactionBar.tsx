import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { CommentIcon, FlameIcon, HighFiveIcon } from '@/components/ui/icons';
import { color, type } from '@/lib/theme';
import type { ReactionType } from '@/lib/types';

interface Props {
  fireCount: number;
  fiveCount: number;
  commentCount: number;
  fireOn: boolean;
  fiveOn: boolean;
  workoutLabel?: string | null;
  onReact: (type: ReactionType) => void;
  onComment?: () => void;
}

/**
 * Fire and high-five are toggles with counts; comment opens a thread.
 * All three are 40pt pills — thumb-safe, no long-press discovery.
 * Fire tints amber, high-five tints lime.
 */
export function ReactionBar({
  fireCount,
  fiveCount,
  commentCount,
  fireOn,
  fiveOn,
  workoutLabel,
  onReact,
  onComment,
}: Props) {
  return (
    <View style={styles.bar}>
      <ReactionPill
        active={fireOn}
        tint={color.tier2}
        count={fireCount}
        onPress={() => onReact('fire')}
        accessibilityLabel="Fire reaction"
        icon={(tint) => <FlameIcon size={16} fill={tint} />}
      />
      <ReactionPill
        active={fiveOn}
        tint={color.accent}
        count={fiveCount}
        onPress={() => onReact('five')}
        accessibilityLabel="High five reaction"
        icon={(tint) => <HighFiveIcon size={16} stroke={tint} />}
      />
      <ReactionPill
        active={false}
        tint={color.textTertiary}
        count={commentCount}
        onPress={onComment}
        accessibilityLabel="Comments"
        icon={(tint) => <CommentIcon size={16} stroke={tint} />}
      />

      <View style={{ flex: 1 }} />
      {workoutLabel ? <Text style={styles.workout}>{workoutLabel}</Text> : null}
    </View>
  );
}

interface PillProps {
  active: boolean;
  tint: string;
  count: number;
  onPress?: () => void;
  accessibilityLabel: string;
  icon: (tint: string) => React.ReactNode;
}

export function ReactionPill({ active, tint, count, onPress, icon, accessibilityLabel }: PillProps) {
  const contentColor = active ? tint : color.textTertiary;
  return (
    <Pill active={active} tint={tint} onPress={onPress}>
      <View accessibilityLabel={accessibilityLabel}>{icon(contentColor)}</View>
      <Text style={[styles.count, { color: contentColor }]}>{count}</Text>
    </Pill>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 11,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  count: {
    fontSize: type.pill.fontSize,
    fontWeight: '700',
  },
  workout: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.textFaint,
  },
});
