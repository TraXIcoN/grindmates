import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronLeft, Minus, Plus, Timer, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/ui/Sheet';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useApp } from '@/hooks/useApp';
import { useRestTimer, formatClock } from '@/hooks/useRestTimer';
import { useTraining } from '@/hooks/useTraining';
import { EXERCISES } from '@/lib/exercises';
import { exerciseMedia } from '@/lib/exerciseMedia';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { getRestDefault } from '@/lib/prefs';
import { accentGlow, alpha, border, color, layout, radius, tierColor, toggleTint, type } from '@/lib/theme';
import {
  addExerciseToSession,
  discardSession,
  endSession,
  guidedIndex,
  logSessionSet,
  removeExerciseFromSession,
  removeSessionSet,
  summarize,
  type Session,
  type SessionExercise,
} from '@/lib/workout';
import type { EffortLevel, MuscleGroup, SetType } from '@/lib/types';

const TYPE_OPTS: Array<{ key: SetType; label: string; tint: string }> = [
  { key: 'warmup', label: 'W', tint: tierColor[1] },
  { key: 'working', label: 'S', tint: color.accent },
  { key: 'drop', label: 'D', tint: tierColor[2] },
  { key: 'failure', label: 'F', tint: tierColor[3] },
];

/**
 * The live workout. Exercises stacked as cards; tick a set and the rest bar
 * rings itself. Finishing rolls the session into the crew check-in — muscles
 * tagged from what was actually trained, the note carrying the best sets.
 */
export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { active } = useTraining();
  const { patchDraft, resetDraft } = useApp();

  const timer = useRestTimer(90);
  /**
   * null = follow the guided pointer (first exercise with unmet targets);
   * a number = the lifter overrode it by tapping a card.
   */
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finished, setFinished] = useState<Session | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [, forceTick] = useState(0);

  // Default rest length is a preference (Settings).
  useEffect(() => {
    void getRestDefault().then((s) => timer.setPreset(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the elapsed-minutes header honest without a per-second render.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const logSet = useCallback(
    (exerciseIndex: number, set: { type: SetType; reps: number | null; weight: number | null }) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logSessionSet(exerciseIndex, set);
      timer.restart();
      // Hand control back to the guided pointer — when this exercise's targets
      // fill, the next one expands and this one contracts.
      setExpanded(null);
    },
    [timer],
  );

  const finish = useCallback(() => {
    const done = endSession();
    timer.pause();
    if (!done) {
      // Nothing was logged — nothing to summarise, nothing to keep.
      router.back();
      return;
    }
    setFinished(done);
  }, [router, timer]);

  const checkIn = useCallback(() => {
    if (!finished) return;
    const sum = summarize(finished);

    // Sets per muscle → effort tier: it trained a little, properly, or a lot.
    const effort: Partial<Record<MuscleGroup, EffortLevel>> = {};
    for (const [muscle, sets] of Object.entries(sum.perMuscleSets) as Array<[MuscleGroup, number]>) {
      effort[muscle] = sets >= 5 ? 3 : sets >= 3 ? 2 : 1;
    }

    const label = (finished.routine ?? finished.muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')).slice(0, 24);

    resetDraft();
    patchDraft({
      effort,
      caption: sum.highlights.join(', '),
      workoutLabel: label,
    });
    router.replace('/(app)/log');
  }, [finished, patchDraft, resetDraft, router]);

  const discard = useCallback(() => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      setTimeout(() => setConfirmDiscard(false), 4000);
      return;
    }
    discardSession();
    router.back();
  }, [confirmDiscard, router]);

  /* ------------------------------------------------------------- summary -- */
  if (finished) {
    const sum = summarize(finished);
    return (
      <View style={styles.screen}>
        <AmbientGlow top={-160} left={-80} />
        <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 26 }]}>
          <Text style={styles.doneEyebrow}>SESSION DONE</Text>
          <Text style={styles.title}>
            {finished.routine ?? finished.muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}
          </Text>

          <View style={styles.sumTiles}>
            <SumTile label="SETS" value={String(sum.sets)} />
            <SumTile label="REPS" value={String(sum.reps)} />
            <SumTile label="VOLUME" value={`${sum.volumeKg} kg`} />
            <SumTile label="TIME" value={`${sum.minutes}m`} />
          </View>

          {sum.highlights.length > 0 ? (
            <View style={styles.highlights}>
              <Text style={styles.sectionLabel}>BEST SETS</Text>
              {sum.highlights.map((h) => (
                <Text key={h} style={styles.highlight}>
                  {h}
                </Text>
              ))}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={checkIn}
            style={({ pressed }) => [styles.cta, pressed && { backgroundColor: color.accentHi }]}
          >
            <Text style={styles.ctaText}>Check in with the crew</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghost, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <Text style={styles.ghostText}>Not now</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /* ---------------------------------------------------------- no session -- */
  if (!active) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>No live session.</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const elapsed = Math.max(1, Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000));
  const resting = timer.running || timer.remaining < timer.duration;

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back — session stays live"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <ChevronLeft size={20} color={color.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.barTitle}>
            {active.routine ?? active.muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}
          </Text>
          <Text style={styles.barMeta}>{elapsed}m live</Text>
        </View>
        <Pressable
          accessibilityLabel="Rest timer"
          onPress={() => router.push('/(app)/timer')}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Timer size={17} color={color.textTertiary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Inline rest bar — logging a set starts it; it rings itself. */}
      {resting ? (
        <View style={styles.restBar}>
          <View
            style={[
              styles.restFill,
              { width: `${Math.max(2, timer.progress * 100)}%` },
              timer.remaining <= 10 && timer.remaining > 0 && { backgroundColor: tierColor[3] },
            ]}
          />
          <View style={styles.restRow}>
            <Text style={styles.restClock}>{formatClock(timer.remaining)}</Text>
            <Text style={styles.restLabel}>
              {timer.remaining === 0 ? 'GO' : timer.running ? 'REST' : 'PAUSED'}
            </Text>
            <Pressable onPress={timer.toggle} hitSlop={10}>
              <Text style={styles.restAction}>{timer.running ? 'Pause' : 'Resume'}</Text>
            </Pressable>
            <Pressable onPress={timer.reset} hitSlop={10}>
              <Text style={styles.restAction}>Skip</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {active.exercises.map((ex, i) => {
          const guided = guidedIndex(active);
          const openIdx = expanded ?? (guided >= 0 ? guided : null);
          return (
            <ExerciseCard
              key={`${ex.name}-${i}`}
              exercise={ex}
              index={i}
              expanded={openIdx === i}
              onToggle={() => setExpanded((cur) => ((cur ?? openIdx) === i ? -1 : i))}
              onLog={(set) => logSet(i, set)}
              onRemoveSet={(j) => removeSessionSet(i, j)}
              onRemove={() => {
                removeExerciseFromSession(i);
                setExpanded(null);
              }}
            />
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.addExercise, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Plus size={15} color={color.textTertiary} strokeWidth={2.4} />
          <Text style={styles.addExerciseText}>Add exercise</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={({ pressed }) => [styles.cta, pressed && { backgroundColor: color.accentHi }]}
        >
          <Text style={styles.ctaText}>Finish session</Text>
        </Pressable>

        <Pressable onPress={discard} hitSlop={10} style={styles.discard}>
          <Text style={[styles.discardText, confirmDiscard && { color: tierColor[3] }]}>
            {confirmDiscard ? 'Tap again to discard the session' : 'Discard session'}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddExerciseSheet
        open={pickerOpen}
        muscles={active.muscles}
        already={active.exercises.map((e) => e.name)}
        onAdd={(name, muscle) => addExerciseToSession(name, muscle)}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

/* ------------------------------------------------------------- exercise --- */

function ExerciseCard({
  exercise,
  index,
  expanded,
  onToggle,
  onLog,
  onRemoveSet,
  onRemove,
}: {
  exercise: SessionExercise;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onLog: (set: { type: SetType; reps: number | null; weight: number | null }) => void;
  onRemoveSet: (setIndex: number) => void;
  onRemove: () => void;
}) {
  const last = exercise.sets[exercise.sets.length - 1] ?? null;
  const [reps, setReps] = useState<number>(last?.reps ?? exercise.targetReps ?? 8);
  const [weight, setWeight] = useState<number | null>(last?.weight ?? null);
  const [setType, setSetType] = useState<SetType>('working');

  // A new set defaults to the previous one — the gym-real starting point.
  useEffect(() => {
    if (last) {
      if (last.reps !== null) setReps(last.reps);
      setWeight(last.weight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.sets.length]);

  const stepWeight = (delta: number) => {
    void Haptics.selectionAsync();
    setWeight((prev) => {
      if (prev === null) return delta > 0 ? 20 : null;
      const next = Math.round((prev + delta * 2.5) * 100) / 100;
      return next < 2.5 ? null : Math.min(400, next);
    });
  };

  const stepReps = (delta: number) => {
    void Haptics.selectionAsync();
    setReps((prev) => Math.max(1, Math.min(50, prev + delta)));
  };

  const guided = exercise.targetSets !== undefined;
  const done = guided && exercise.sets.length >= (exercise.targetSets ?? 0);
  const frames = exerciseMedia(exercise.name, exercise.muscle);

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[styles.exCard, expanded && styles.exCardActive]}
    >
      <Pressable onPress={onToggle} style={styles.exHead} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{exercise.name}</Text>
          <Text style={styles.exMeta}>
            {MUSCLE_LABEL[exercise.muscle]}
            {guided
              ? ` · set ${Math.min(exercise.sets.length + 1, exercise.targetSets!)} of ${exercise.targetSets} · ${exercise.targetReps} reps`
              : ` · ${exercise.sets.length} set${exercise.sets.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {/* The confirm: one tap logs the target set and moves the workout on. */}
        {guided ? (
          done ? (
            <View style={[styles.completeBtn, styles.completeDone]}>
              <Check size={16} color={color.onAccent} strokeWidth={3} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Complete set for ${exercise.name}`}
              onPress={() => onLog({ type: setType, reps, weight })}
              hitSlop={8}
              style={({ pressed }) => [
                styles.completeBtn,
                pressed && { backgroundColor: alpha(color.accent, 0.25) },
              ]}
            >
              <Check size={16} color={color.accent} strokeWidth={2.6} />
            </Pressable>
          )
        ) : (
          <Pressable accessibilityLabel={`Remove ${exercise.name}`} onPress={onRemove} hitSlop={10}>
            <X size={15} color={color.textFaint} strokeWidth={2.2} />
          </Pressable>
        )}
      </Pressable>

      {/* The movement itself, while the exercise is live. */}
      {expanded && frames.length > 0 ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.mediaRow}>
          {frames.map((src, k) => (
            <Image key={k} source={src} style={styles.mediaFrame} contentFit="cover" transition={120} />
          ))}
        </Animated.View>
      ) : null}

      {exercise.sets.length > 0 ? (
        <View style={styles.setRows}>
          {exercise.sets.map((s, j) => {
            const opt = TYPE_OPTS.find((o) => o.key === s.type)!;
            return (
              <Pressable
                key={`${j}-${s.at}`}
                onLongPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onRemoveSet(j);
                }}
                delayLongPress={300}
                accessibilityLabel={`Set ${j + 1}. Hold to remove.`}
                style={styles.setRow}
              >
                <Text style={styles.setIndex}>{j + 1}</Text>
                <Text style={[styles.setTypeGlyph, { color: opt.tint }]}>{opt.label}</Text>
                <Text style={styles.setValue}>
                  {s.weight !== null ? `${s.weight} kg` : '—'}
                </Text>
                <Text style={styles.setReps}>{s.reps !== null ? `× ${s.reps}` : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.editor}>
          <View style={styles.editorRow}>
            <StepPill icon="minus" onPress={() => stepWeight(-1)} dim={weight === null} />
            <Text style={styles.editorValue}>{weight === null ? 'no weight' : `${weight} kg`}</Text>
            <StepPill icon="plus" onPress={() => stepWeight(1)} />
            <View style={{ width: 12 }} />
            <StepPill icon="minus" onPress={() => stepReps(-1)} />
            <Text style={[styles.editorValue, { minWidth: 44 }]}>{`× ${reps}`}</Text>
            <StepPill icon="plus" onPress={() => stepReps(1)} />
          </View>

          <View style={styles.editorRow}>
            <View style={styles.typeRow}>
              {TYPE_OPTS.map((o) => (
                <Pressable
                  key={o.key}
                  accessibilityLabel={`${o.key} set`}
                  accessibilityState={{ selected: setType === o.key }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSetType(o.key);
                  }}
                  style={[
                    styles.typeChip,
                    setType === o.key && {
                      backgroundColor: alpha(o.tint, 0.15),
                      borderColor: alpha(o.tint, 0.45),
                    },
                  ]}
                >
                  <Text
                    style={[styles.typeChipText, setType === o.key && { color: o.tint }]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log set for ${exercise.name}`}
              onPress={() => onLog({ type: setType, reps, weight })}
              style={({ pressed }) => [
                styles.logBtn,
                pressed && { backgroundColor: alpha(color.accent, 0.22) },
              ]}
            >
              <Text style={styles.logBtnText}>Log set</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function StepPill({ icon, onPress, dim }: { icon: 'minus' | 'plus'; onPress: () => void; dim?: boolean }) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'Less' : 'More'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.stepPill,
        dim ? { opacity: 0.4 } : null,
        pressed && { backgroundColor: color.surfaceHi },
      ]}
    >
      <Icon size={13} color={color.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

/* ----------------------------------------------------------- add picker --- */

function AddExerciseSheet({
  open,
  muscles,
  already,
  onAdd,
  onClose,
}: {
  open: boolean;
  muscles: MuscleGroup[];
  already: string[];
  onAdd: (name: string, muscle: MuscleGroup) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: Array<{ name: string; muscle: MuscleGroup }> = [];
    // Session muscles first — that's what's most likely wanted mid-workout.
    const order = [...muscles, ...(Object.keys(EXERCISES) as MuscleGroup[]).filter((m) => !muscles.includes(m))];
    for (const m of order) {
      for (const name of EXERCISES[m]) {
        if (already.includes(name)) continue;
        if (q && !name.toLowerCase().includes(q)) continue;
        all.push({ name, muscle: m });
      }
    }
    return all.slice(0, 30);
  }, [query, muscles, already]);

  return (
    <Sheet open={open} onClose={onClose} bottomPad={32}>
      <Text style={styles.sheetTitle}>Add exercise</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search"
        placeholderTextColor={color.textFaint}
        style={styles.search}
        autoCorrect={false}
      />
      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        {rows.map((r) => (
          <Pressable
            key={r.name}
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync();
              onAdd(r.name, r.muscle);
              onClose();
            }}
            style={({ pressed }) => [styles.pickRow, pressed && { backgroundColor: color.surface }]}
          >
            <Text style={styles.pickName}>{r.name}</Text>
            <Text style={styles.pickMuscle}>{MUSCLE_LABEL[r.muscle]}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function SumTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sumTile}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: { paddingHorizontal: layout.gutter, paddingTop: 12 },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 10,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.14, color: color.text, maxWidth: 220 },
  barMeta: { marginTop: 1, fontSize: 10.5, fontWeight: '700', color: color.muted },

  restBar: {
    marginHorizontal: layout.gutter,
    marginBottom: 4,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
    overflow: 'hidden',
  },
  restFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: alpha(color.accent, 0.16),
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  restClock: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  restLabel: { flex: 1, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: color.muted },
  restAction: { fontSize: 12, fontWeight: '700', color: color.accent },

  exCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  exCardActive: { borderColor: alpha(color.accent, 0.35) },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: alpha(color.accent, 0.45),
    backgroundColor: alpha(color.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeDone: { backgroundColor: color.accent, borderColor: color.accent },
  mediaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mediaFrame: {
    flex: 1,
    height: 108,
    borderRadius: 12,
    backgroundColor: color.photoBg,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, color: color.text },
  exMeta: { marginTop: 2, fontSize: 11.5, fontWeight: '600', color: color.muted },

  setRows: { marginTop: 10, gap: 4 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  setIndex: { width: 14, fontSize: 10, fontWeight: '700', color: color.textFaint },
  setTypeGlyph: { width: 14, fontSize: 11, fontWeight: '900' },
  setValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  setReps: { fontSize: 13, fontWeight: '700', color: color.textSecondary, fontVariant: ['tabular-nums'] },

  editor: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border.faint, gap: 10 },
  editorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editorValue: {
    minWidth: 84,
    textAlign: 'center',
    fontSize: 13.5,
    fontWeight: '800',
    color: color.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  stepPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRow: { flexDirection: 'row', gap: 6, flex: 1 },
  typeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: { fontSize: 11, fontWeight: '900', color: color.textTertiary },
  logBtn: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...toggleTint(color.accent),
    borderWidth: 1,
  },
  logBtnText: { fontSize: 13, fontWeight: '800', color: color.accent },

  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: radius.menu,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: border.dashed,
    backgroundColor: alpha(color.surface, 0.35),
  },
  addExerciseText: { fontSize: 13, fontWeight: '700', color: color.textTertiary },

  cta: {
    marginTop: 16,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ctaText: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
  ghost: {
    marginTop: 10,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 14, fontWeight: '700', color: color.textTertiary },
  discard: { marginTop: 16, alignSelf: 'center' },
  discardText: { fontSize: 12.5, fontWeight: '700', color: color.textFaint },

  emptyTitle: { fontSize: 16, fontWeight: '800', color: color.text },

  doneEyebrow: { fontSize: type.eyebrow.fontSize, fontWeight: '700', letterSpacing: 1.76, color: color.accent },
  title: {
    marginTop: 10,
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: color.text,
  },
  sumTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  sumTile: {
    flexGrow: 1,
    flexBasis: '47%',
    padding: 14,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  sumLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: color.muted },
  sumValue: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  highlights: { marginTop: 22 },
  sectionLabel: {
    marginBottom: 10,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },
  highlight: { fontSize: 14, fontWeight: '600', lineHeight: 24, color: color.textSecondary },

  sheetTitle: {
    fontSize: type.sheetTitle.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: color.text,
    marginBottom: 12,
  },
  search: {
    height: 46,
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.text,
    fontSize: 14.5,
    fontWeight: '500',
    marginBottom: 10,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pickName: { fontSize: 14, fontWeight: '600', color: color.text },
  pickMuscle: { fontSize: 11.5, fontWeight: '600', color: color.muted },
});
