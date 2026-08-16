import type { MuscleGroup } from './types';

/**
 * The 10 major groups from the brief. `side` drives which body map they sit
 * on; positions are percentages of the body-map box so regions scale with the
 * container, and they are calibrated to the drawn anatomy in BodyMap.
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
  /**
   * Bilateral muscles (arms, calves, delts) get two hit targets at x ± pair
   * instead of one band across the torso — a band would steal centre taps
   * from chest/back.
   */
  pair?: number;
}

export const MUSCLES: MuscleMeta[] = [
  { key: 'shoulders', label: 'Shoulders', side: 'front', x: 50, y: 18.7, w: 16, h: 8, pair: 17 },
  { key: 'chest', label: 'Chest', side: 'front', x: 50, y: 23.5, w: 32, h: 9 },
  { key: 'biceps', label: 'Biceps', side: 'front', x: 50, y: 27, w: 14, h: 10, pair: 27.5 },
  { key: 'core', label: 'Core', side: 'front', x: 50, y: 36, w: 22, h: 13 },
  { key: 'quads', label: 'Quads', side: 'front', x: 50, y: 62, w: 32, h: 20 },
  { key: 'triceps', label: 'Triceps', side: 'back', x: 50, y: 28.5, w: 14, h: 10, pair: 27.5 },
  { key: 'back', label: 'Back', side: 'back', x: 50, y: 27, w: 34, h: 18 },
  { key: 'glutes', label: 'Glutes', side: 'back', x: 50, y: 47, w: 34, h: 9 },
  { key: 'hamstrings', label: 'Hamstrings', side: 'back', x: 50, y: 61, w: 32, h: 17 },
  { key: 'calves', label: 'Calves', side: 'back', x: 50, y: 84, w: 14, h: 12, pair: 8.5 },
];

export const MUSCLE_LABEL: Record<MuscleGroup, string> = MUSCLES.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {} as Record<MuscleGroup, string>,
);
