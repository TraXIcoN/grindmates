/**
 * Single source of truth for domain types.
 * Mirrors supabase/migrations/0001_init.sql exactly.
 */

export type EffortLevel = 1 | 2 | 3;

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type ReactionType = 'fire' | 'five';

export const SET_TYPES = ['warmup', 'working', 'drop', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  streak_count: number;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  emblem: string;
  owner_id: string;
  created_at: string;
  /** Joined in via the roster query, not a column. */
  member_count?: number;
}

export interface MuscleLog {
  id: string;
  check_in_id: string;
  muscle_group: MuscleGroup;
  effort_level: EffortLevel;
}

export interface Reaction {
  id: string;
  check_in_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  group_id: string | null;
  photo_url: string | null;
  caption: string | null;
  workout_label: string | null;
  strain: number | null;
  created_at: string;
}

/** A feed row: check-in + everything the card renders, resolved. */
export interface FeedItem extends CheckIn {
  profile: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'streak_count'>;
  muscles: Array<Pick<MuscleLog, 'muscle_group' | 'effort_level'>>;
  counts: Record<ReactionType, number>;
  /** Which reactions the signed-in user has already given. */
  mine: Record<ReactionType, boolean>;
  comment_count: number;
  /** Optimistic rows render at reduced opacity until the insert lands. */
  pending?: boolean;
}

/** The in-progress check-in, held in context between camera -> log -> post. */
export interface CheckInDraft {
  photoUri: string | null;
  caption: string;
  workoutLabel: string;
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
}

export const EMPTY_DRAFT: CheckInDraft = {
  photoUri: null,
  caption: '',
  workoutLabel: '',
  effort: {},
};
