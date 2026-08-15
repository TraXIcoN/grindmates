import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountdownDial } from '@/components/timer/CountdownDial';
import { SetTypeSelector } from '@/components/timer/SetTypeSelector';
import { StrainCard } from '@/components/timer/StrainCard';
import { TransportRow } from '@/components/timer/TransportRow';
import { useRestTimer } from '@/hooks/useRestTimer';
import { alpha, border, color, radius, toggleTint, type } from '@/lib/theme';
import type { SetType } from '@/lib/types';

const PRESETS = [60, 90, 120, 180];

/**
 * In-workout overlay. Presented as a transparent modal over whatever screen you
 * were on, so opening it never unmounts the feed.
 */
export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const timer = useRestTimer(90);

  const [setType, setSetType] = useState<SetType>('working');
  const [setsRested, setSetsRested] = useState(0);
  const [restBanked, setRestBanked] = useState(0);

  function handleReset() {
    // A reset after a completed rest counts as a finished set.
    if (timer.remaining === 0 || timer.remaining < timer.duration) {
      setSetsRested((n) => n + 1);
      setRestBanked((s) => s + (timer.duration - timer.remaining));
    }
    timer.reset();
  }

  return (
    <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Close" />

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(190)}
        exiting={SlideOutDown.duration(160)}
        style={[styles.panel, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.grabber} />

        <View style={styles.head}>
          <Text style={styles.title}>Rest</Text>
          <Pressable
            accessibilityLabel="Close rest timer"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.close, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <X size={18} color={color.textTertiary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.dialWrap}>
          <CountdownDial
            remaining={timer.remaining}
            progress={timer.progress}
            running={timer.running}
          />
        </View>

        <View style={styles.presets}>
          {PRESETS.map((seconds) => (
            <Pressable
              key={seconds}
              onPress={() => timer.setPreset(seconds)}
              style={({ pressed }) => [
                styles.preset,
                timer.duration === seconds && styles.presetOn,
                pressed && { backgroundColor: color.surfaceHi },
              ]}
            >
              <Text
                style={[
                  styles.presetLabel,
                  timer.duration === seconds && { color: color.accent },
                ]}
              >
                {seconds < 120 ? `${seconds}s` : `${seconds / 60}m`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.transport}>
          <TransportRow
            running={timer.running}
            onToggle={timer.toggle}
            onReset={handleReset}
            onNudge={timer.nudge}
          />
        </View>

        <Text style={styles.sectionLabel}>SET TYPE</Text>
        <SetTypeSelector value={setType} onChange={setSetType} />

        <View style={{ marginTop: 20 }}>
          <StrainCard
            strain={Math.min(21, setsRested * 1.6)}
            sets={setsRested}
            totalRestSeconds={restBanked}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: alpha(color.scrim, 0.72) },
  panel: {
    width: '100%',
    backgroundColor: color.bgRaised,
    borderTopWidth: 1,
    borderTopColor: border.soft,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.slate700,
    alignSelf: 'center',
    marginBottom: 14,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontSize: type.sheetTitle.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: color.text,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dialWrap: { alignItems: 'center', marginTop: 10 },
  presets: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 },
  preset: {
    minWidth: 54,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetOn: toggleTint(color.accent),
  presetLabel: { fontSize: 12.5, fontWeight: '700', color: color.textTertiary },

  transport: { alignItems: 'center', marginTop: 20 },
  sectionLabel: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
    textAlign: 'center',
  },
});
