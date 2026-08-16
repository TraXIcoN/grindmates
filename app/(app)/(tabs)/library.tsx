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
import { Plus, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useTraining } from '@/hooks/useTraining';
import { EXERCISES } from '@/lib/exercises';
import { MUSCLE_LABEL, MUSCLES } from '@/lib/muscles';
import { alpha, border, color, layout, radius, toggleTint, type } from '@/lib/theme';
import { addExerciseToSession, toggleFavorite } from '@/lib/workout';
import type { MuscleGroup } from '@/lib/types';

/**
 * Every exercise the app knows, searchable and filterable. Stars pin
 * favourites to the top; with a live session running, a + on each row drops
 * the exercise straight into it.
 */
export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites, active } = useTraining();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | null>(null);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

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

        {rows.map((r) => (
          <View key={r.name} style={styles.row}>
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
          </View>
        ))}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
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
