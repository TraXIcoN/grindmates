import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calculator, Minus, Plus, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountdownDial } from '@/components/timer/CountdownDial';
import { RepsPicker } from '@/components/timer/RepsPicker';
import { SetLogList, type LoggedSet } from '@/components/timer/SetLogList';
import { SetTypeSelector } from '@/components/timer/SetTypeSelector';
import { StrainCard } from '@/components/timer/StrainCard';
import { TransportRow } from '@/components/timer/TransportRow';
import { useRestTimer } from '@/hooks/useRestTimer';
import { alpha, border, color, radius, toggleTint, type } from '@/lib/theme';
import type { SetType } from '@/lib/types';

const PRESETS = [60, 90, 120, 180];

/**
 * In-workout overlay. Presented as a transparent modal over whatever screen
 * you were on, so opening it never unmounts the feed.
 *
 * The loop it is built around: finish a set → tag it (type, reps if you count
 * them) → one tap logs it and starts the rest → lift again at zero. Reps are
 * an option, not a demand — the play button alone is still a plain rest timer.
 */
export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const timer = useRestTimer(90);

  const [setType, setSetType] = useState<SetType>('working');
  const [reps, setReps] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [restBanked, setRestBanked] = useState(0);

  /** Whatever rest has elapsed on the current countdown, into the bank. */
  const bankElapsed = useCallback(() => {
    if (timer.remaining < timer.duration) {
      setRestBanked((s) => s + (timer.duration - timer.remaining));
    }
  }, [timer.remaining, timer.duration]);

  /** The one-tap path: record the set just finished, start resting. */
  const logSet = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bankElapsed();
    setSets((prev) => [...prev, { type: setType, reps, weight }]);
    timer.restart();
  }, [bankElapsed, setType, reps, weight, timer]);

  /** ±2.5 kg; from nothing, the first press starts at the bar. */
  const stepWeight = useCallback((delta: number) => {
    void Haptics.selectionAsync();
    setWeight((prev) => {
      if (prev === null) return delta > 0 ? 20 : null;
      const next = Math.round((prev + delta * 2.5) * 100) / 100;
      return next < 2.5 ? null : Math.min(400, next);
    });
  }, []);

  const removeSet = useCallback((index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReset = useCallback(() => {
    bankElapsed();
    timer.reset();
  }, [bankElapsed, timer]);

  const totalReps = useMemo(
    () => sets.reduce<number>((sum, s) => sum + (s.reps ?? 0), 0),
    [sets],
  );
  const anyReps = sets.some((s) => s.reps !== null);

  return (
    <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Close" />

      <Animated.View
        entering={SlideInDown.duration(220)}
        exiting={SlideOutDown.duration(160)}
        style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.grabber} />

        <View style={styles.head}>
          <Text style={styles.title}>Rest</Text>
          <View style={styles.headActions}>
            <Pressable
              accessibilityLabel="Gym calculators"
              onPress={() => router.push('/(app)/tools')}
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <Calculator size={16} color={color.textTertiary} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              accessibilityLabel="Close rest timer"
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <X size={18} color={color.textTertiary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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

          <Text style={styles.sectionLabel}>THIS SET</Text>
          <SetTypeSelector value={setType} onChange={setSetType} />

          <View style={{ marginTop: 12 }}>
            <RepsPicker value={reps} onChange={setReps} />
          </View>

          {/* Load, optional like reps. − from the lowest step clears it. */}
          <View style={styles.weightRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Less weight"
              onPress={() => stepWeight(-1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.weightStep,
                { opacity: weight === null ? 0.35 : 1 },
                pressed && weight !== null && { backgroundColor: color.surfaceHi },
              ]}
            >
              <Minus size={14} color={color.textTertiary} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.weightValue}>{weight === null ? 'no weight' : `${weight} kg`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More weight"
              onPress={() => stepWeight(1)}
              hitSlop={8}
              style={({ pressed }) => [styles.weightStep, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <Plus size={14} color={color.textTertiary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={logSet}
            style={({ pressed }) => [
              styles.logCta,
              pressed && { backgroundColor: alpha(color.accent, 0.22) },
            ]}
          >
            <Text style={styles.logCtaText}>
              {reps === null && weight === null
                ? 'Log set · rest'
                : reps !== null && weight !== null
                  ? `Log set · ${reps} × ${weight} kg`
                  : reps !== null
                    ? `Log set · ${reps} reps`
                    : `Log set · ${weight} kg`}
            </Text>
          </Pressable>

          {sets.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>SESSION</Text>
              <SetLogList sets={sets} onRemove={removeSet} />
            </>
          ) : null}

          <View style={{ marginTop: sets.length > 0 ? 14 : 22 }}>
            <StrainCard
              strain={Math.min(21, sets.length * 1.6)}
              sets={sets.length}
              totalReps={anyReps ? totalReps : null}
              totalRestSeconds={restBanked}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: alpha(color.scrim, 0.72) },
  panel: {
    width: '100%',
    maxHeight: '92%',
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
  headActions: { flexDirection: 'row', gap: 8 },
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

  dialWrap: { alignItems: 'center', marginTop: 8 },
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

  transport: { alignItems: 'center', marginTop: 18 },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
    textAlign: 'center',
  },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  weightStep: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightValue: {
    minWidth: 92,
    textAlign: 'center',
    fontSize: 13.5,
    fontWeight: '800',
    color: color.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  /** Accent-outline, not solid lime — the play button stays the screen's one
   *  glowing action, and this reads as its strong sibling. */
  logCta: {
    marginTop: 14,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...toggleTint(color.accent),
    borderWidth: 1,
  },
  logCtaText: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, color: color.accent },
});
