import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CalendarDays, Plus, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useTraining } from '@/hooks/useTraining';
import { EXERCISES } from '@/lib/exercises';
import { exerciseMedia } from '@/lib/exerciseMedia';
import { MUSCLE_LABEL, MUSCLES } from '@/lib/muscles';
import { alpha, border, color, layout, radius, toggleTint, type } from '@/lib/theme';
import { addExerciseToRoutine, addExerciseToSession, toggleFavorite } from '@/lib/workout';
import type { MuscleGroup } from '@/lib/types';

/**
 * Every exercise the app knows, searchable and filterable. Stars pin
 * favourites to the top; with a live session running, a + on each row drops
 * the exercise straight into it.
 */
export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites, active, routines } = useTraining();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | null>(null);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
  /** One expanded row at a time — tap to open, tap again to close. */
  const [openRow, setOpenRow] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: Array<{ name: string; muscle: MuscleGroup; fav: boolean }> = [];
    for (const [muscle, names] of Object.entries(EXERCISES) as Array<[MuscleGroup, string[]]>) {
      if (filter && muscle !== filter) continue;
      for (const name of names) {
        if (q && !name.toLowerCase().includes(q)) continue;
        all.push({ name, muscle, fav: favorites.includes(name) });
      }
    }
    // Favourites first, then the catalog's compound-first order.
    return all.sort((a, b) => Number(b.fav) - Number(a.fav));
  }, [query, filter, favorites]);

  const addToSession = (name: string, muscle: MuscleGroup) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addExerciseToSession(name, muscle);
    setAddedFlash(name);
    setTimeout(() => setAddedFlash(null), 1400);
  };

  const addToRoutine = (routineId: string, name: string, muscle: MuscleGroup) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const added = addExerciseToRoutine(routineId, name, muscle);
    setAddedFlash(added ? `${routineId}:${name}` : `dup:${name}`);
    setTimeout(() => setAddedFlash(null), 1400);
  };

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[]}
      >
        <Text style={styles.title}>Library</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={color.textFaint}
          style={styles.search}
          autoCorrect={false}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label="All" active={filter === null} onPress={() => setFilter(null)} />
          {MUSCLES.map((m) => (
            <FilterChip
              key={m.key}
              label={m.label}
              active={filter === m.key}
              onPress={() => setFilter((cur) => (cur === m.key ? null : m.key))}
            />
          ))}
        </ScrollView>

        {active ? (
          <Pressable onPress={() => router.push('/(app)/session')} hitSlop={8}>
            <Text style={styles.liveHint}>
              Session live — tap <Text style={{ color: color.accent }}>+</Text> to add an exercise to it.
            </Text>
          </Pressable>
        ) : null}

        {rows.map((r) => {
          const open = openRow === r.name;
          const frames = open ? exerciseMedia(r.name, r.muscle) : [];
          return (
            <Animated.View
              key={r.name}
              layout={LinearTransition.duration(180)}
              style={[styles.row, open && styles.rowOpen]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={r.name}
                accessibilityState={{ expanded: open }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setOpenRow((cur) => (cur === r.name ? null : r.name));
                }}
                style={styles.rowHead}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={r.fav ? `Unstar ${r.name}` : `Star ${r.name}`}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    toggleFavorite(r.name);
                  }}
                  hitSlop={8}
                >
                  <Star
                    size={16}
                    color={r.fav ? color.accent : color.textFaint}
                    fill={r.fav ? color.accent : 'transparent'}
                    strokeWidth={2}
                  />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  <Text style={styles.rowMuscle}>{MUSCLE_LABEL[r.muscle]}</Text>
                </View>
                {active ? (
                  addedFlash === r.name ? (
                    <Text style={styles.added}>Added</Text>
                  ) : active.exercises.some((e) => e.name === r.name) ? (
                    <Text style={styles.inSession}>In session</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${r.name} to session`}
                      onPress={() => addToSession(r.name, r.muscle)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.addBtn, pressed && { backgroundColor: color.surfaceHi }]}
                    >
                      <Plus size={14} color={color.accent} strokeWidth={2.4} />
                    </Pressable>
                  )
                ) : null}
              </Pressable>

              {open ? (
                <Animated.View entering={FadeIn.duration(160)}>
                  {frames.length > 0 ? (
                    <View style={styles.mediaRow}>
                      {frames.map((src, k) => (
                        <Image key={k} source={src} style={styles.mediaFrame} contentFit="cover" transition={120} />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noMedia}>No demonstration for this one yet.</Text>
                  )}

                  {routines.length > 0 ? (
                    <View style={styles.routineRow}>
                      <CalendarDays size={13} color={color.muted} strokeWidth={2} />
                      <Text style={styles.routineLabel}>Add to</Text>
                      {routines.slice(0, 3).map((rt) => {
                        const inIt = rt.exercises.some((e) => e.name === r.name);
                        const flashed = addedFlash === `${rt.id}:${r.name}`;
                        return (
                          <Pressable
                            key={rt.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${r.name} to ${rt.name}`}
                            disabled={inIt && !flashed}
                            onPress={() => addToRoutine(rt.id, r.name, r.muscle)}
                            style={({ pressed }) => [
                              styles.routineChip,
                              (inIt || flashed) && {
                                backgroundColor: alpha(color.accent, 0.13),
                                borderColor: alpha(color.accent, 0.38),
                              },
                              pressed && !inIt && { backgroundColor: color.surfaceHi },
                            ]}
                          >
                            <Text
                              style={[styles.routineChipText, (inIt || flashed) && { color: color.accent }]}
                            >
                              {flashed ? 'Added' : inIt ? `In ${rt.name}` : rt.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noMedia}>Create a routine on Train to add exercises to it.</Text>
                  )}
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}

        {rows.length === 0 ? (
          <Text style={styles.empty}>Nothing matches — try a shorter search.</Text>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.filterChip, active && styles.filterChipOn]}
    >
      <Text style={[styles.filterText, active && { color: color.accent }]}>{label}</Text>
    </Pressable>
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

  search: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.text,
    fontSize: 15,
    fontWeight: '500',
  },
  filters: { gap: 7, paddingVertical: 12 },
  filterChip: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipOn: toggleTint(color.accent),
  filterText: { fontSize: 12, fontWeight: '700', color: color.textTertiary },

  liveHint: { marginBottom: 10, fontSize: 12, fontWeight: '600', color: color.muted },

  row: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  rowOpen: { borderColor: alpha(color.accent, 0.3) },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mediaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mediaFrame: { flex: 1, height: 104, borderRadius: 11, backgroundColor: color.photoBg },
  noMedia: { marginTop: 12, fontSize: 11.5, fontWeight: '500', color: color.textFaint },
  routineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  routineLabel: { fontSize: 11, fontWeight: '600', color: color.muted },
  routineChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  routineChipText: { fontSize: 11.5, fontWeight: '700', color: color.textTertiary },
  rowName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.text },
  rowMuscle: { marginTop: 1, fontSize: 11, fontWeight: '600', color: color.muted },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: alpha(color.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  added: { fontSize: 11.5, fontWeight: '700', color: color.accent },
  inSession: { fontSize: 11, fontWeight: '600', color: color.textFaint },
  empty: { marginTop: 18, fontSize: 13, fontWeight: '500', color: color.muted },
});
