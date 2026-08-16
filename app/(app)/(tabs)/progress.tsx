import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalRing } from '@/components/progress/GoalRing';
import { Heatmap } from '@/components/progress/Heatmap';
import { SplitBars } from '@/components/progress/SplitBars';
import { WeightCard } from '@/components/progress/WeightCard';
import { StrengthCard } from '@/components/progress/StrengthCard';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/hooks/useApp';
import {
  fetchMyCheckIns,
  fetchWeights,
  logWeight,
  type HistoryItem,
  type WeightEntry,
} from '@/lib/api';
import { useTraining } from '@/hooks/useTraining';
import { checkInsThisWeek, muscleSplit, records } from '@/lib/stats';
import { border, color, layout, radius, type } from '@/lib/theme';

const GOAL_KEY = 'grindmates.weeklyGoal';

/**
 * Everything on this screen is computed from the person's own check-ins —
 * the "Nothing decorative" rule. Sections: weekly goal, activity heatmap,
 * records, 30-day muscle split, bodyweight, account.
 */
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useApp();
  // Subscribing here re-renders the strength section when sessions finish.
  useTraining();
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [goal, setGoal] = useState(4);
  const [weightBusy, setWeightBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void fetchMyCheckIns(userId, 120)
      .then((rows) => alive && setItems(rows))
      .catch(() => {});
    void fetchWeights(userId)
      .then((rows) => alive && setWeights(rows))
      .catch(() => {});
    void AsyncStorage.getItem(GOAL_KEY).then((raw) => {
      const n = raw ? Number(raw) : NaN;
      if (alive && Number.isFinite(n) && n >= 2 && n <= 7) setGoal(n);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const week = useMemo(() => checkInsThisWeek(items), [items]);
  const split = useMemo(() => muscleSplit(items, 30), [items]);
  const rec = useMemo(() => records(items), [items]);

  const changeGoal = useCallback((next: number) => {
    setGoal(next);
    void AsyncStorage.setItem(GOAL_KEY, String(next));
  }, []);

  const saveWeight = useCallback(
    (kg: number) => {
      if (!userId) return;
      setWeightBusy(true);
      void logWeight(userId, kg)
        .then((entry) =>
          setWeights((prev) => [...prev.filter((w) => w.measured_on !== entry.measured_on), entry]
            .sort((a, b) => a.measured_on.localeCompare(b.measured_on))),
        )
        .catch(() => {})
        .finally(() => setWeightBusy(false));
    },
    [userId],
  );

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
        <Text style={styles.barTitle}>Progress</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Who */}
        <View style={styles.who}>
          <Avatar username={profile?.username ?? 'you'} url={profile?.avatar_url ?? null} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.whoName}>{profile?.username ?? 'you'}</Text>
            <Text style={styles.whoMeta}>
              Day {profile?.streak_count ?? 0} streak · {rec.totalCheckIns} check-in
              {rec.totalCheckIns === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <GoalRing done={week} goal={goal} onGoal={changeGoal} />
        </View>

        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        <View style={styles.card}>
          <Heatmap items={items} weeks={16} />
        </View>

        <Text style={styles.sectionLabel}>RECORDS</Text>
        <View style={styles.tiles}>
          <Tile label="DAYS ACTIVE" value={String(rec.daysActive)} />
          <Tile label="AVG STRAIN" value={rec.avgStrain > 0 ? rec.avgStrain.toFixed(1) : '—'} />
          <Tile
            label="BEST STRAIN"
            value={rec.bestStrain > 0 ? rec.bestStrain.toFixed(1) : '—'}
            hint={rec.bestStrainLabel ?? undefined}
          />
          <Tile label="THIS WEEK" value={`${week}/${goal}`} />
        </View>

        <Text style={styles.sectionLabel}>MUSCLE SPLIT · 30 DAYS</Text>
        <View style={styles.card}>
          <SplitBars rows={split} />
        </View>

        <Text style={styles.sectionLabel}>STRENGTH</Text>
        <View style={styles.card}>
          <StrengthCard />
        </View>

        <Text style={styles.sectionLabel}>BODYWEIGHT</Text>
        <View style={styles.card}>
          <WeightCard entries={weights} busy={weightBusy} onLog={saveWeight} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {hint ? (
        <Text style={styles.tileHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
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

  who: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  whoName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.36, color: color.text },
  whoMeta: { marginTop: 2, fontSize: 12.5, fontWeight: '600', color: color.muted },

  card: {
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    padding: 14,
    borderRadius: radius.menu,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  tileLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: color.muted },
  tileValue: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  tileHint: { marginTop: 2, fontSize: 11, fontWeight: '600', color: color.textTertiary },

});
