import type { MuscleGroup } from './types';

/**
 * Exercise suggestions per muscle group — shown when a region is focused on
 * the body map. Names double as taggable tokens: tapping one appends it to the
 * check-in note, tapping again removes it, so the note stays the single source
 * of truth for what was actually done.
 */
export const EXERCISES: Record<MuscleGroup, string[]> = {
  chest: ['Bench Press', 'Incline DB Press', 'Weighted Dips', 'Cable Fly', 'Push-ups'],
  back: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row'],
  shoulders: ['Overhead Press', 'Lateral Raise', 'Arnold Press', 'Face Pulls', 'Rear Delt Fly'],
  biceps: ['Barbell Curl', 'Incline DB Curl', 'Hammer Curl', 'Preacher Curl', 'Chin-ups'],
  triceps: ['Close-Grip Bench', 'Skullcrushers', 'Rope Pushdown', 'Overhead Extension', 'Dips'],
  core: ['Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel', 'Plank', 'Pallof Press'],
  quads: ['Back Squat', 'Front Squat', 'Leg Press', 'Split Squat', 'Leg Extension'],
  hamstrings: ['Romanian Deadlift', 'Lying Leg Curl', 'Good Mornings', 'Nordic Curl', 'Seated Leg Curl'],
  glutes: ['Hip Thrust', 'Sumo Deadlift', 'Cable Kickback', 'Walking Lunge', 'Step-ups'],
  calves: ['Standing Calf Raise', 'Seated Calf Raise', 'Donkey Calf Raise', 'Single-Leg Raise', 'Jump Rope'],
};
