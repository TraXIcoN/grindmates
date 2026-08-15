import type { MuscleGroup } from './types';

/**
 * The 10 major groups from the brief, in the order they appear on the picker
 * grid. `side` drives which body map they sit on; `x`/`y` are percentages of
 * the body-map box so regions scale with the container.
 */
export interface MuscleMeta {
  key: MuscleGroup;
  label: string;
  side: 'front' | 'back';
  /** Region centre, in % of the body-map box. */
  x: number;
  y: number;
  /** Region size, in % of the box. */
  w: number;
  h: number;
}

export const MUSCLES: MuscleMeta[] = [
  { key: 'chest', label: 'Chest', side: 'front', x: 50, y: 26, w: 42, h: 11 },
  { key: 'shoulders', label: 'Shoulders', side: 'front', x: 50, y: 19, w: 62, h: 8 },
  { key: 'biceps', label: 'Biceps', side: 'front', x: 50, y: 34, w: 74, h: 10 },
  { key: 'core', label: 'Core', side: 'front', x: 50, y: 39, w: 34, h: 14 },
  { key: 'quads', label: 'Quads', side: 'front', x: 50, y: 62, w: 44, h: 18 },
  { key: 'back', label: 'Back', side: 'back', x: 50, y: 29, w: 46, h: 16 },
  { key: 'triceps', label: 'Triceps', side: 'back', x: 50, y: 35, w: 76, h: 10 },
  { key: 'glutes', label: 'Glutes', side: 'back', x: 50, y: 50, w: 40, h: 10 },
  { key: 'hamstrings', label: 'Hamstrings', side: 'back', x: 50, y: 64, w: 44, h: 15 },
  { key: 'calves', label: 'Calves', side: 'back', x: 50, y: 83, w: 40, h: 12 },
];

export const MUSCLE_LABEL: Record<MuscleGroup, string> = MUSCLES.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {} as Record<MuscleGroup, string>,
);
