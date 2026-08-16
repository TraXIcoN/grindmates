import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, Play, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyMap } from '@/components/log/BodyMap';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useTraining } from '@/hooks/useTraining';
import { MUSCLE_LABEL, MUSCLES } from '@/lib/muscles';
import { accentGlow, alpha, border, color, layout, radius, toggleTint, type } from '@/lib/theme';
import { routineForToday, startSession, summarize, todayIndex } from '@/lib/workout';
import type { MuscleGroup } from '@/lib/types';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Tap the muscles you want to train, get a session picked for you, edit it
 * set by set. A live session always resumes from here — it survives closing
 * the app mid-workout.
 */
export default function TrainScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { active, routines } = useTraining();

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [picked, setPicked] = useState<MuscleGroup[]>([]);

  const toggle = useCallback((muscle: MuscleGroup) => {
    void Haptics.selectionAsync();
    setPicked((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  }, []);

  const begin = useCallback(() => {
    if (picked.length === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startSession(picked);
    setPicked([]);
    router.push('/(app)/session');
  }, [picked, router]);

  const beginRoutine = useCallback(() => {
    const routine = routineForToday();
    if (!routine) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startSession([], routine.exercises, routine.name);
    router.push('/(app)/session');
  }, [router]);

  const today = routineForToday();
  const activeSummary = active ? summarize(active) : null;

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Train</Text>

        {/* Live session — always the first thing offered. */}
        {active ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/session')}
            style={({ pressed }) => [styles.resume, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <View style={styles.resumeDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>
                {active.routine ?? active.muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}
              </Text>
              <Text style={styles.resumeMeta}>
                Live · {activeSummary?.sets ?? 0} set{(activeSummary?.sets ?? 0) === 1 ? '' : 's'} ·{' '}
                {activeSummary?.minutes ?? 1}m
              </Text>
            </View>
            <ChevronRight size={18} color={color.textTertiary} strokeWidth={2.2} />
          </Pressable>
        ) : null}

        {/* Today's routine, when one is scheduled. */}
        {!active && today ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${today.name}`}
            onPress={beginRoutine}
            style={({ pressed }) => [styles.todayCard, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.todayEyebrow}>TODAY</Text>
              <Text style={styles.todayName}>{today.name}</Text>
              <Text style={styles.todayMeta}>
                {today.exercises.length} exercise{today.exercises.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.todayPlay}>
              <Play size={18} color={color.onAccent} fill={color.onAccent} />
            </View>
          </Pressable>
        ) : null}

        {/* The picker. */}
        <View style={styles.mapCard}>
          <View style={styles.sideToggle}>
            {(['front', 'back'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSide(s);
                }}
                style={[styles.sideBtn, side === s && styles.sideBtnOn]}
              >
                <Text style={[styles.sideLabel, side === s && { color: color.accent }]}>
                  {s === 'front' ? 'FRONT' : 'BACK'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.mapWrap}>
            <BodyMap side={side} selected={picked} onPick={toggle} width={172} />
          </View>

          {picked.length > 0 ? (
            <View style={styles.pickedRow}>
              {picked.map((m) => (
                <Pressable key={m} onPress={() => toggle(m)} style={styles.pickedChip}>
                  <Text style={styles.pickedChipText}>{MUSCLE_LABEL[m]}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.mapHint}>Tap the muscles you&apos;re training today.</Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={picked.length === 0 || !!active}
          onPress={begin}
          style={({ pressed }) => [
            styles.cta,
            (picked.length === 0 || !!active) && styles.ctaOff,
            pressed && picked.length > 0 && !active && { backgroundColor: color.accentHi },
          ]}
        >
          <Text
            style={[styles.ctaText, (picked.length === 0 || !!active) && { color: color.muted }]}
          >
            {active ? 'Finish the live session first' : 'Start session'}
          </Text>
        </Pressable>

        {/* Routines. */}
        <View style={styles.routinesHead}>
          <Text style={styles.sectionLabel}>ROUTINES</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New routine"
            onPress={() => router.push('/(app)/routine-edit')}
            hitSlop={10}
            style={({ pressed }) => [styles.newBtn, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <Plus size={13} color={color.textTertiary} strokeWidth={2.4} />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>

        {routines.length === 0 ? (
          <Text style={styles.emptyRoutines}>
            Save a split — Push A, Legs, whatever you run — and schedule it on weekdays. The one
            due today shows up here ready to start.
          </Text>
        ) : (
          routines.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/(app)/routine-edit', params: { id: r.id } })}
              style={({ pressed }) => [styles.routineRow, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <CalendarDays size={16} color={color.textTertiary} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routineName}>{r.name}</Text>
                <Text style={styles.routineMeta}>
                  {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.dayDots}>
                {DAY_LETTERS.map((d, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.dayDot,
                      r.days.includes(i) && {
                        color: i === todayIndex() ? color.accent : color.textSecondary,
                      },
                    ]}
                  >
                    {d}
                  </Text>
                ))}
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: layout.gutter },
  title: {
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: color.text,
  },

  resume: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: alpha(color.accent, 0.35),
  },
  resumeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
  resumeTitle: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, color: color.text },
  resumeMeta: { marginTop: 2, fontSize: 12, fontWeight: '600', color: color.muted },

  todayCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  todayEyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: color.accent },
  todayName: { marginTop: 3, fontSize: 17, fontWeight: '800', letterSpacing: -0.34, color: color.text },
  todayMeta: { marginTop: 2, fontSize: 12, fontWeight: '600', color: color.muted },
  todayPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },

  mapCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  sideToggle: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sideBtn: {
    height: 34,
    minWidth: 86,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnOn: toggleTint(color.accent),
  sideLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: color.textTertiary },
  mapWrap: { alignItems: 'center', marginTop: 14 },
  mapHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: color.textFaint,
    textAlign: 'center',
  },
  pickedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  pickedChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: alpha(color.accent, 0.13),
    borderWidth: 1,
    borderColor: alpha(color.accent, 0.38),
  },
  pickedChipText: { fontSize: 12, fontWeight: '700', color: color.accent },

  cta: {
    marginTop: 14,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ctaOff: { backgroundColor: color.surface, shadowOpacity: 0, elevation: 0 },
  ctaText: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },

  routinesHead: {
    marginTop: 26,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: color.textTertiary },

  emptyRoutines: { fontSize: 13, fontWeight: '500', lineHeight: 19, color: color.muted },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  routineName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.text },
  routineMeta: { marginTop: 1, fontSize: 11.5, fontWeight: '600', color: color.muted },
  dayDots: { flexDirection: 'row', gap: 4 },
  dayDot: { fontSize: 10, fontWeight: '800', color: color.textFaint },
});
