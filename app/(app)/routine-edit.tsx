import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/ui/Sheet';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useTraining } from '@/hooks/useTraining';
import { EXERCISES } from '@/lib/exercises';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { accentGlow, border, color, layout, radius, tierColor, toggleTint, type } from '@/lib/theme';
import { deleteRoutine, saveRoutine, type RoutineExercise } from '@/lib/workout';
import type { MuscleGroup } from '@/lib/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Name a split, schedule its weekdays, pick its exercises. The routine due
 * today surfaces on the Train tab, one tap from starting.
 */
export default function RoutineEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { routines } = useTraining();

  const existing = useMemo(() => routines.find((r) => r.id === id) ?? null, [routines, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [exercises, setExercises] = useState<RoutineExercise[]>(existing?.exercises ?? []);

  /** One-tap cycles keep the row compact — no steppers crowding the tile. */
  const SETS_CYCLE = [2, 3, 4, 5];
  const REPS_CYCLE = [5, 6, 8, 10, 12, 15, 20];
  const cycle = (arr: number[], cur: number | undefined, fallback: number) => {
    const now = cur ?? fallback;
    const idx = arr.indexOf(now);
    return arr[(idx + 1) % arr.length] ?? fallback;
  };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = name.trim().length >= 2 && exercises.length > 0;

  const toggleDay = (i: number) => {
    void Haptics.selectionAsync();
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]));
  };

  const save = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveRoutine({ id: existing?.id, name: name.trim(), days, exercises });
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    deleteRoutine(existing.id);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <ChevronLeft size={20} color={color.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.barTitle}>{existing ? 'Edit routine' : 'New routine'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Push A"
          placeholderTextColor={color.textFaint}
          style={styles.input}
          maxLength={24}
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>DAYS</Text>
        <View style={styles.days}>
          {DAY_LABELS.map((d, i) => {
            const on = days.includes(i);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggleDay(i)}
                style={[styles.dayChip, on && styles.dayChipOn]}
              >
                <Text style={[styles.dayText, on && { color: color.accent }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>EXERCISES</Text>
        {exercises.map((e, i) => (
          <View key={`${e.name}-${i}`} style={styles.exRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exName}>{e.name}</Text>
              <Text style={styles.exMuscle}>{MUSCLE_LABEL[e.muscle]}</Text>
            </View>

            {/* Tap to cycle targets — 3 × 10 by default. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${e.sets ?? 3} sets, tap to change`}
              onPress={() => {
                void Haptics.selectionAsync();
                setExercises((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, sets: cycle(SETS_CYCLE, x.sets, 3) } : x)),
                );
              }}
              style={({ pressed }) => [styles.targetChip, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <Text style={styles.targetValue}>{e.sets ?? 3}</Text>
              <Text style={styles.targetUnit}>sets</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${e.reps ?? 10} reps, tap to change`}
              onPress={() => {
                void Haptics.selectionAsync();
                setExercises((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, reps: cycle(REPS_CYCLE, x.reps, 10) } : x)),
                );
              }}
              style={({ pressed }) => [styles.targetChip, pressed && { backgroundColor: color.surfaceHi }]}
            >
              <Text style={styles.targetValue}>{e.reps ?? 10}</Text>
              <Text style={styles.targetUnit}>reps</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={`Remove ${e.name}`}
              onPress={() => setExercises((prev) => prev.filter((_, j) => j !== i))}
              hitSlop={10}
            >
              <X size={15} color={color.textFaint} strokeWidth={2.2} />
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.addRow, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Plus size={15} color={color.textTertiary} strokeWidth={2.4} />
          <Text style={styles.addRowText}>Add exercise</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.cta,
            !canSave && styles.ctaOff,
            pressed && canSave && { backgroundColor: color.accentHi },
          ]}
        >
          <Text style={[styles.ctaText, !canSave && { color: color.muted }]}>
            {existing ? 'Save changes' : 'Save routine'}
          </Text>
        </Pressable>

        {existing ? (
          <Pressable onPress={remove} hitSlop={10} style={styles.deleteBtn}>
            <Text style={[styles.deleteText, confirmDelete && { color: tierColor[3] }]}>
              {confirmDelete ? 'Tap again to delete this routine' : 'Delete routine'}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PickSheet
        open={pickerOpen}
        already={exercises.map((e) => e.name)}
        onAdd={(name2, muscle) =>
          setExercises((prev) => [...prev, { name: name2, muscle, sets: 3, reps: 10 }])
        }
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function PickSheet({
  open,
  already,
  onAdd,
  onClose,
}: {
  open: boolean;
  already: string[];
  onAdd: (name: string, muscle: MuscleGroup) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: Array<{ name: string; muscle: MuscleGroup }> = [];
    for (const [muscle, names] of Object.entries(EXERCISES) as Array<[MuscleGroup, string[]]>) {
      for (const name of names) {
        if (already.includes(name)) continue;
        if (q && !name.toLowerCase().includes(q)) continue;
        all.push({ name, muscle });
      }
    }
    return all.slice(0, 30);
  }, [query, already]);

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
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
  barTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.textTertiary },
  body: { paddingHorizontal: layout.gutter, paddingTop: 6 },

  fieldLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: color.muted,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.text,
    fontSize: 15,
    fontWeight: '500',
  },

  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dayChip: {
    minWidth: 44,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: toggleTint(color.accent),
  dayText: { fontSize: 12, fontWeight: '700', color: color.textTertiary },

  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginBottom: 7,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  exName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.text },
  exMuscle: { marginTop: 1, fontSize: 11, fontWeight: '600', color: color.muted },
  targetChip: {
    alignItems: 'center',
    minWidth: 42,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  targetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  targetUnit: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, color: color.muted },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: radius.menu,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: border.dashed,
    backgroundColor: 'transparent',
  },
  addRowText: { fontSize: 13, fontWeight: '700', color: color.textTertiary },

  cta: {
    marginTop: 22,
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
  deleteBtn: { marginTop: 16, alignSelf: 'center' },
  deleteText: { fontSize: 12.5, fontWeight: '700', color: color.textFaint },

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
