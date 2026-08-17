import AsyncStorage from '@react-native-async-storage/async-storage';

import { EXERCISES } from './exercises';
import type { MuscleGroup, SetType } from './types';

/**
 * The private training log: live session, history, routines, favourites.
 *
 * Deliberately device-local in BOTH modes. Check-ins are the shared, social
 * artifact; the set-by-set log is the lifter's own notebook. Everything here
 * writes through to AsyncStorage on every mutation, so a live session
 * survives an app kill or reboot — reopen the app mid-workout and carry on.
 */

/* ---------------------------------------------------------------- types --- */

export interface WorkoutSet {
  type: SetType;
  reps: number | null;
  weight: number | null;
  at: string;
}

export interface SessionExercise {
  name: string;
  muscle: MuscleGroup;
  sets: WorkoutSet[];
  /** Guided targets, present when the session came from a routine. */
  targetSets?: number;
  targetReps?: number;
}

export interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  /** The routine that seeded this session, if any. */
  routine: string | null;
  muscles: MuscleGroup[];
  exercises: SessionExercise[];
}

export interface RoutineExercise {
  name: string;
  muscle: MuscleGroup;
  /** Target sets × reps; older saved routines may lack them (default 3×10). */
  sets?: number;
  reps?: number;
}

export interface Routine {
  id: string;
  name: string;
  /** 0 = Monday … 6 = Sunday. */
  days: number[];
  exercises: RoutineExercise[];
}

interface TrainingStore {
  active: Session | null;
  history: Session[];
  routines: Routine[];
  favorites: string[];
}

/* ---------------------------------------------------------------- store --- */

const KEY = 'grindmates.training.v1';

const store: TrainingStore = { active: null, history: [], routines: [], favorites: [] };

let hydrated = false;

export async function hydrateTraining(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<TrainingStore>;
      store.active = saved.active ?? null;
      store.history = saved.history ?? [];
      store.routines = saved.routines ?? [];
      store.favorites = saved.favorites ?? [];
    }
  } catch {
    // Corrupt blob: start clean rather than brick training.
  }
  emit();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void AsyncStorage.setItem(KEY, JSON.stringify(store)).catch(() => {});
  }, 120);
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeTraining(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

/** Read-only snapshot accessors (return fresh references on change). */
export function getActiveSession(): Session | null {
  return store.active;
}
export function getHistory(): Session[] {
  return store.history;
}
export function getRoutines(): Routine[] {
  return store.routines;
}
export function getFavorites(): string[] {
  return store.favorites;
}

/* -------------------------------------------------------------- session --- */

/** Muscle a free-typed or library exercise belongs to. */
export function muscleOf(name: string): MuscleGroup {
  for (const [muscle, names] of Object.entries(EXERCISES) as Array<[MuscleGroup, string[]]>) {
    if (names.includes(name)) return muscle;
  }
  return 'core';
}

/**
 * Start a session from picked muscles: the opening exercise list is picked
 * for you — the two compound-first moves per muscle — then edited freely.
 */
export function startSession(
  muscles: MuscleGroup[],
  seed?: RoutineExercise[],
  routineName: string | null = null,
): Session {
  const exercises: SessionExercise[] =
    seed && seed.length > 0
      ? seed.map((e) => ({
          name: e.name,
          muscle: e.muscle,
          sets: [],
          // A routine session is guided: every exercise carries its targets.
          targetSets: e.sets ?? 3,
          targetReps: e.reps ?? 10,
        }))
      : muscles.flatMap((m) =>
          EXERCISES[m].slice(0, 2).map((name) => ({ name, muscle: m, sets: [] })),
        );

  const session: Session = {
    id: `s-${Date.now()}`,
    started_at: new Date().toISOString(),
    ended_at: null,
    routine: routineName,
    muscles: [...new Set(seed ? seed.map((e) => e.muscle) : muscles)],
    exercises,
  };
  store.active = session;
  persist();
  emit();
  return session;
}

export function addExerciseToSession(name: string, muscle: MuscleGroup): void {
  if (!store.active) return;
  if (store.active.exercises.some((e) => e.name === name)) return;
  store.active = {
    ...store.active,
    muscles: [...new Set([...store.active.muscles, muscle])],
    exercises: [...store.active.exercises, { name, muscle, sets: [] }],
  };
  persist();
  emit();
}

export function removeExerciseFromSession(index: number): void {
  if (!store.active) return;
  const exercises = store.active.exercises.filter((_, i) => i !== index);
  store.active = {
    ...store.active,
    exercises,
    muscles: [...new Set(exercises.map((e) => e.muscle))],
  };
  persist();
  emit();
}

export function logSessionSet(exerciseIndex: number, set: Omit<WorkoutSet, 'at'>): void {
  if (!store.active) return;
  store.active = {
    ...store.active,
    exercises: store.active.exercises.map((e, i) =>
      i === exerciseIndex ? { ...e, sets: [...e.sets, { ...set, at: new Date().toISOString() }] } : e,
    ),
  };
  persist();
  emit();
}

export function removeSessionSet(exerciseIndex: number, setIndex: number): void {
  if (!store.active) return;
  store.active = {
    ...store.active,
    exercises: store.active.exercises.map((e, i) =>
      i === exerciseIndex ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) } : e,
    ),
  };
  persist();
  emit();
}

/** Ends the live session into history and returns it (null if nothing logged). */
export function endSession(): Session | null {
  if (!store.active) return null;
  const done: Session = { ...store.active, ended_at: new Date().toISOString() };
  store.active = null;
  // A session with zero sets is noise — drop it rather than pollute history.
  const hasSets = done.exercises.some((e) => e.sets.length > 0);
  if (hasSets) store.history = [done, ...store.history].slice(0, 200);
  persist();
  emit();
  return hasSets ? done : null;
}

export function discardSession(): void {
  store.active = null;
  persist();
  emit();
}

/* -------------------------------------------------------------- summary --- */

export interface SessionSummary {
  sets: number;
  reps: number;
  volumeKg: number;
  minutes: number;
  perMuscleSets: Partial<Record<MuscleGroup, number>>;
  /** "Bench Press 60×12" style highlights, best set per exercise. */
  highlights: string[];
}

export function summarize(session: Session): SessionSummary {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  const perMuscle: Partial<Record<MuscleGroup, number>> = {};
  const highlights: string[] = [];

  for (const ex of session.exercises) {
    if (ex.sets.length === 0) continue;
    sets += ex.sets.length;
    perMuscle[ex.muscle] = (perMuscle[ex.muscle] ?? 0) + ex.sets.length;
    let best: WorkoutSet | null = null;
    for (const s of ex.sets) {
      reps += s.reps ?? 0;
      volume += (s.reps ?? 0) * (s.weight ?? 0);
      const score = (s.weight ?? 0) * 1000 + (s.reps ?? 0);
      const bestScore = best ? (best.weight ?? 0) * 1000 + (best.reps ?? 0) : -1;
      if (score > bestScore) best = s;
    }
    if (best) {
      const bit =
        best.weight !== null && best.reps !== null
          ? `${ex.name} ${best.weight}×${best.reps}`
          : best.reps !== null
            ? `${ex.name} ×${best.reps}`
            : ex.name;
      highlights.push(bit);
    }
  }

  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const minutes = Math.max(1, Math.round((end - new Date(session.started_at).getTime()) / 60000));

  return { sets, reps, volumeKg: Math.round(volume), minutes, perMuscleSets: perMuscle, highlights };
}

/* ------------------------------------------------------------- routines --- */

export function saveRoutine(routine: Omit<Routine, 'id'> & { id?: string }): Routine {
  const saved: Routine = { ...routine, id: routine.id ?? `r-${Date.now()}` };
  const idx = store.routines.findIndex((r) => r.id === saved.id);
  store.routines =
    idx >= 0
      ? store.routines.map((r) => (r.id === saved.id ? saved : r))
      : [...store.routines, saved];
  persist();
  emit();
  return saved;
}

export function deleteRoutine(id: string): void {
  store.routines = store.routines.filter((r) => r.id !== id);
  persist();
  emit();
}

/** Library → routine: append an exercise (default 3×10) if not already in it. */
export function addExerciseToRoutine(routineId: string, name: string, muscle: MuscleGroup): boolean {
  const routine = store.routines.find((r) => r.id === routineId);
  if (!routine) return false;
  if (routine.exercises.some((e) => e.name === name)) return false;
  routine.exercises = [...routine.exercises, { name, muscle, sets: 3, reps: 10 }];
  persist();
  emit();
  return true;
}

/**
 * The guided pointer: the first exercise whose target isn't met yet.
 * -1 when the session has no targets or everything is done.
 */
export function guidedIndex(session: Session): number {
  return session.exercises.findIndex(
    (e) => e.targetSets !== undefined && e.sets.length < e.targetSets,
  );
}

/** Monday-based day index for today, matching Routine.days. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export function routineForToday(): Routine | null {
  const today = todayIndex();
  return store.routines.find((r) => r.days.includes(today)) ?? null;
}

/* ------------------------------------------------------------ favorites --- */

export function toggleFavorite(name: string): void {
  store.favorites = store.favorites.includes(name)
    ? store.favorites.filter((n) => n !== name)
    : [...store.favorites, name];
  persist();
  emit();
}

/* ------------------------------------------------------------- strength --- */

export interface StrengthPoint {
  date: string;
  est1rm: number;
}

/** Epley est-1RM of the best set per finished session, oldest first. */
export function strengthCurve(exercise: string): StrengthPoint[] {
  const points: StrengthPoint[] = [];
  for (const session of store.history) {
    const ex = session.exercises.find((e) => e.name === exercise);
    if (!ex) continue;
    let best = 0;
    for (const s of ex.sets) {
      if (s.weight === null) continue;
      const reps = s.reps ?? 1;
      const est = reps <= 1 ? s.weight : s.weight * (1 + reps / 30);
      if (est > best) best = est;
    }
    if (best > 0) {
      points.push({ date: session.started_at, est1rm: Math.round(best * 10) / 10 });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Exercises with at least one weighted set in history, most-trained first. */
export function trackedExercises(): string[] {
  const tally = new Map<string, number>();
  for (const session of store.history) {
    for (const ex of session.exercises) {
      if (ex.sets.some((s) => s.weight !== null)) {
        tally.set(ex.name, (tally.get(ex.name) ?? 0) + 1);
      }
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/* --------------------------------------------------------------- backup --- */

export function exportTraining(): TrainingStore {
  return { ...store };
}

export async function wipeTraining(): Promise<void> {
  store.active = null;
  store.history = [];
  store.routines = [];
  store.favorites = [];
  if (saveTimer) clearTimeout(saveTimer);
  await AsyncStorage.removeItem(KEY).catch(() => {});
  emit();
}
