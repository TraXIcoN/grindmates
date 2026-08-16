import type { HistoryItem } from './api';
import type { MuscleGroup } from './types';

/**
 * Pure derivations for the progress screen. Everything here is computed from
 * the person's own check-ins — no invented numbers, per the design brief.
 */

/** Local-time YYYY-MM-DD, the key the heatmap and streaks bucket by. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface HeatDay {
  key: string;
  date: Date;
  /** 0 = nothing, 1–4 = sequential intensity from that day's best strain. */
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
  bestStrain: number;
  label: string | null;
  /** True for dates after today (trailing cells of the current week). */
  future: boolean;
}

/**
 * A GitHub-style grid: `weeks` columns × 7 rows, ending on today's week
 * (Monday-first). Intensity is sequential — one hue, stepped by strain.
 */
export function buildHeatmap(items: HistoryItem[], weeks = 16): HeatDay[][] {
  const byDay = new Map<string, { count: number; best: number; label: string | null }>();
  for (const item of items) {
    const key = dayKey(new Date(item.created_at));
    const prev = byDay.get(key) ?? { count: 0, best: 0, label: null };
    const strain = item.strain ?? 0;
    byDay.set(key, {
      count: prev.count + 1,
      best: Math.max(prev.best, strain),
      label: strain >= prev.best ? (item.workout_label ?? prev.label) : prev.label,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Monday of the current week.
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const columns: HeatDay[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() - w * 7 + d);
      const key = dayKey(date);
      const hit = byDay.get(key);
      const level: HeatDay['level'] = !hit
        ? 0
        : hit.best >= 14
          ? 4
          : hit.best >= 9
            ? 3
            : hit.best >= 4
              ? 2
              : 1;
      col.push({
        key,
        date,
        level,
        count: hit?.count ?? 0,
        bestStrain: hit?.best ?? 0,
        label: hit?.label ?? null,
        future: date.getTime() > today.getTime(),
      });
    }
    columns.push(col);
  }
  return columns;
}

/** Distinct check-in days since Monday of the current week. */
export function checkInsThisWeek(items: HistoryItem[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = new Set<string>();
  for (const item of items) {
    const d = new Date(item.created_at);
    if (d.getTime() >= monday.getTime()) days.add(dayKey(d));
  }
  return days.size;
}

export interface SplitRow {
  muscle: MuscleGroup;
  /** Sum of effort tiers over the window — volume-ish, from real tags. */
  score: number;
}

/** Effort-weighted muscle distribution over the last `days`. */
export function muscleSplit(items: HistoryItem[], days = 30): SplitRow[] {
  const cutoff = Date.now() - days * 86_400_000;
  const tally = new Map<MuscleGroup, number>();
  for (const item of items) {
    if (new Date(item.created_at).getTime() < cutoff) continue;
    for (const m of item.muscles) {
      tally.set(m.muscle_group, (tally.get(m.muscle_group) ?? 0) + m.effort_level);
    }
  }
  return [...tally.entries()]
    .map(([muscle, score]) => ({ muscle, score }))
    .sort((a, b) => b.score - a.score);
}

export interface Records {
  totalCheckIns: number;
  daysActive: number;
  bestStrain: number;
  bestStrainLabel: string | null;
  bestStrainDate: string | null;
  avgStrain: number;
}

export function records(items: HistoryItem[]): Records {
  const days = new Set<string>();
  let best = 0;
  let bestLabel: string | null = null;
  let bestDate: string | null = null;
  let sum = 0;
  let strained = 0;

  for (const item of items) {
    days.add(dayKey(new Date(item.created_at)));
    const strain = item.strain ?? 0;
    if (strain > best) {
      best = strain;
      bestLabel = item.workout_label;
      bestDate = item.created_at;
    }
    if (item.strain !== null) {
      sum += item.strain;
      strained += 1;
    }
  }

  return {
    totalCheckIns: items.length,
    daysActive: days.size,
    bestStrain: best,
    bestStrainLabel: bestLabel,
    bestStrainDate: bestDate,
    avgStrain: strained > 0 ? Math.round((sum / strained) * 10) / 10 : 0,
  };
}

/* ----------------------------------------------------------- calculators -- */

/** Epley estimate; the standard gym-floor formula. */
export function oneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

/** Per-side plate breakdown for a target total on a given bar. */
export function plateMath(
  targetKg: number,
  barKg: number,
): { plates: number[]; achieved: number; remainder: number } {
  const perSide = Math.max(0, (targetKg - barKg) / 2);
  const plates: number[] = [];
  let left = perSide;
  for (const p of PLATES_KG) {
    while (left >= p - 1e-9) {
      plates.push(p);
      left = Math.round((left - p) * 100) / 100;
    }
  }
  const achieved = barKg + (perSide - left) * 2;
  return { plates, achieved, remainder: Math.round(left * 2 * 100) / 100 };
}

export interface WarmupSet {
  label: string;
  weightKg: number;
  reps: number;
}

/** A standard ramp to a working weight: bar, 40%, 60%, 80%, 90%. */
export function warmupRamp(workingKg: number, barKg: number): WarmupSet[] {
  const pct = (f: number) => Math.max(barKg, Math.round((workingKg * f) / 2.5) * 2.5);
  const sets: WarmupSet[] = [
    { label: 'Bar', weightKg: barKg, reps: 10 },
    { label: '40%', weightKg: pct(0.4), reps: 8 },
    { label: '60%', weightKg: pct(0.6), reps: 5 },
    { label: '80%', weightKg: pct(0.8), reps: 3 },
    { label: '90%', weightKg: pct(0.9), reps: 1 },
  ];
  // Collapse duplicates that all clamp to the bar on light working weights.
  return sets.filter((s, i) => i === 0 || s.weightKg > sets[i - 1].weightKg);
}
