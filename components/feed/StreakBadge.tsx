import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { StreakFlameIcon } from '@/components/ui/icons';
import { alpha, color, radius } from '@/lib/theme';

/**
 * Streak count in ember. The only warm thing above the fold, so it registers
 * without a label. Flame runs the `flamepulse` loop from the design:
 * opacity .55 -> 1, scale 1 -> 1.12, 2.4s, ease-in-out, infinite.
 */
export function StreakBadge({ count }: { count: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [t]);

  const flame = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.45,
    transform: [{ scale: 1 + t.value * 0.12 }],
  }));

  return (
    <View style={styles.badge} accessibilityLabel={`${count} day streak`}>
      <Animated.View style={flame}>
        <StreakFlameIcon size={15} />
      </Animated.View>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingLeft: 9,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: alpha(color.tier3, 0.12),
    borderWidth: 1,
    borderColor: alpha(color.tier3, 0.3),
  },
  count: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.28,
    color: color.ember,
  },
});
