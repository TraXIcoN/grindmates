import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { border, color } from '@/lib/theme';

/**
 * Boot loader — the bar gets loaded before you do.
 *
 * A barbell builds itself plate by plate (heaviest first, like a real
 * warm-up to a top set), the wordmark rises once the bar is loaded, and the
 * whole thing holds for a beat before fading into the app. Everything is
 * timing-based ease-out — no springs, no bounce, per the house rule.
 *
 * Total run: ~2.5s build + hold, then a 380ms fade driven by the parent
 * (`BootGate`), which also waits for session hydration so the loader never
 * lifts onto a half-booted screen.
 */

const EASE_OUT = Easing.out(Easing.cubic);
const BAR_W = 224;

/** One plate. Slides in from its own side and settles without overshoot. */
function Plate({
  delay,
  side,
  height,
  width,
  accent,
}: {
  delay: number;
  side: 'left' | 'right';
  height: number;
  width: number;
  accent?: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 420, easing: EASE_OUT }));
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateX: (1 - t.value) * (side === 'left' ? -72 : 72) }],
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 4,
          backgroundColor: accent ? color.accent : color.surfaceHi,
          borderWidth: accent ? 0 : 1,
          borderColor: border.strong,
        },
        style,
      ]}
    />
  );
}

export function BootScreen({ fading }: { fading: boolean }) {
  const bar = useSharedValue(0);
  const mark = useSharedValue(0);
  const tag = useSharedValue(0);
  const breathe = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    bar.value = withTiming(1, { duration: 380, easing: EASE_OUT });
    mark.value = withDelay(1250, withTiming(1, { duration: 420, easing: EASE_OUT }));
    tag.value = withDelay(1650, withTiming(1, { duration: 380, easing: EASE_OUT }));
    breathe.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [bar, mark, tag, breathe]);

  useEffect(() => {
    if (fading) out.value = withTiming(0, { duration: 380, easing: Easing.inOut(Easing.ease) });
  }, [fading, out]);

  const overlay = useAnimatedStyle(() => ({ opacity: out.value }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: bar.value,
    transform: [{ scaleX: 0.72 + 0.28 * bar.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ translateY: (1 - mark.value) * 10 }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.07 * breathe.value }],
  }));

  return (
    <Animated.View
      pointerEvents={fading ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.root, overlay]}
    >
      <Animated.View style={[styles.glowWrap, glowStyle]}>
        <AmbientGlow size={420} top={0} left={0} opacity={0.12} />
      </Animated.View>

      {/* The barbell: sleeve · plates · bar · plates · sleeve. Heaviest
          plates load first, closest to the collar — like you'd load it. */}
      <Animated.View style={[styles.barbell, barStyle]}>
        <Plate delay={750} side="left" width={11} height={34} />
        <Plate delay={350} side="left" width={13} height={46} accent />
        <View style={styles.bar} />
        <Plate delay={550} side="right" width={13} height={46} accent />
        <Plate delay={950} side="right" width={11} height={34} />
      </Animated.View>

      <Animated.Text style={[styles.wordmark, markStyle]}>GRINDMATES</Animated.Text>
      <Animated.Text style={[styles.tagline, tagStyle]}>LOAD UP. SHOW UP.</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  glowWrap: {
    position: 'absolute',
    width: 420,
    height: 420,
    alignSelf: 'center',
  },
  barbell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: BAR_W - 2 * (13 + 11 + 9),
    height: 7,
    borderRadius: 4,
    backgroundColor: color.slate600,
    marginHorizontal: 6,
  },
  wordmark: {
    marginTop: 34,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 5,
    color: color.accent,
  },
  tagline: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.6,
    color: color.textTertiary,
  },
});
