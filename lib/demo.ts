import Constants from 'expo-constants';

import { DEMO_PHOTOS } from './demoPhotos';
import type {
  CheckIn,
  EffortLevel,
  FeedItem,
  Group,
  MuscleGroup,
  Profile,
  ReactionType,
} from './types';

/* -------------------------------------------------------------------------- */
/* The switch                                                                 */
/* -------------------------------------------------------------------------- */

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';

/**
 * True when no real Supabase project is configured.
 *
 * Every network call site checks this first and serves the fixtures below
 * instead. That makes `npx expo start` work with zero setup, and lets the
 * GitHub Pages build show the actual app rather than stranding a visitor on a
 * sign-in screen wired to a backend that does not exist.
 *
 * The moment EXPO_PUBLIC_SUPABASE_URL points at a real project, every one of
 * those branches switches off and nothing in this file runs again.
 */
export const DEMO = !configuredUrl || configuredUrl.includes('YOUR-PROJECT');

/* -------------------------------------------------------------------------- */
/* Clock                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `n` hours ago — but never earlier than 00:20 today.
 *
 * Without the clamp the fixtures drift across local midnight: open the demo at
 * 03:00 and a "5h ago" post lands on yesterday, so the feed header counts one
 * check-in instead of two and the nudge card names the wrong people.
 */
function hoursAgoToday(hours: number): string {
  const now = Date.now();
  const floor = new Date();
  floor.setHours(0, 20, 0, 0);
  return new Date(Math.max(now - hours * 3_600_000, floor.getTime())).toISOString();
}

function daysAgo(days: number, atHour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(atHour, 12, 0, 0);
  return d.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Cast                                                                       */
/* -------------------------------------------------------------------------- */

export const DEMO_USER_ID = 'demo-you';

const you: Profile = {
  id: DEMO_USER_ID,
  username: 'You',
  avatar_url: null,
  streak_count: 4,
  created_at: daysAgo(38, 9),
};

const cast: Profile[] = [
  you,
  { id: 'demo-ryan', username: 'Ryan M.', avatar_url: null, streak_count: 12, created_at: daysAgo(64, 9) },
  { id: 'demo-sofia', username: 'Sofia D.', avatar_url: null, streak_count: 7, created_at: daysAgo(51, 9) },
  { id: 'demo-marcus', username: 'Marcus T.', avatar_url: null, streak_count: 2, created_at: daysAgo(30, 9) },
  { id: 'demo-priya', username: 'Priya R.', avatar_url: null, streak_count: 0, created_at: daysAgo(21, 9) },
  { id: 'demo-devon', username: 'Devon K.', avatar_url: null, streak_count: 5, created_at: daysAgo(45, 9) },
  { id: 'demo-alina', username: 'Alina W.', avatar_url: null, streak_count: 1, created_at: daysAgo(12, 9) },
  { id: 'demo-jonas', username: 'Jonas B.', avatar_url: null, streak_count: 9, created_at: daysAgo(58, 9) },
];

const CREW: Group = {
  id: 'demo-crew',
  name: '6AM Crew',
  emblem: '🔥',
  owner_id: 'demo-ryan',
  created_at: daysAgo(64, 9),
  member_count: 8,
};

const CIRCLE: Group = {
  id: 'demo-circle',
  name: 'Iron Circle',
  emblem: '⚡',
  owner_id: DEMO_USER_ID,
  created_at: daysAgo(20, 9),
  member_count: 5,
};

/** group id -> roster. The 6AM Crew is everyone; Iron Circle is a subset. */
const roster: Record<string, string[]> = {
  [CREW.id]: cast.map((p) => p.id),
  [CIRCLE.id]: [DEMO_USER_ID, 'demo-ryan', 'demo-devon', 'demo-jonas', 'demo-alina'],
};

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

interface DemoRow extends CheckIn {
  muscles: Array<{ muscle_group: MuscleGroup; effort_level: EffortLevel }>;
  /** user_id -> the reactions that user has given. */
  reactions: Array<{ user_id: string; type: ReactionType }>;
  comment_count: number;
}

function seedRows(): DemoRow[] {
  return [
    {
      id: 'demo-post-ryan',
      user_id: 'demo-ryan',
      group_id: CREW.id,
      photo_url: DEMO_PHOTOS.rack,
      caption: 'Bench moved today. 3 plates for a clean triple.',
      workout_label: 'Push A',
      strain: 9.8,
      created_at: hoursAgoToday(2),
      muscles: [
        { muscle_group: 'chest', effort_level: 3 },
        { muscle_group: 'triceps', effort_level: 2 },
        { muscle_group: 'shoulders', effort_level: 2 },
      ],
      reactions: [
        { user_id: 'demo-sofia', type: 'fire' },
        { user_id: 'demo-devon', type: 'fire' },
        { user_id: 'demo-jonas', type: 'fire' },
        { user_id: 'demo-alina', type: 'five' },
      ],
      comment_count: 3,
    },
    {
      id: 'demo-post-sofia',
      user_id: 'demo-sofia',
      group_id: CREW.id,
      photo_url: DEMO_PHOTOS.dumbbells,
      caption: 'Legs before sunrise so nothing else can cancel it.',
      workout_label: 'Lower',
      strain: 12.6,
      created_at: hoursAgoToday(5),
      muscles: [
        { muscle_group: 'quads', effort_level: 3 },
        { muscle_group: 'glutes', effort_level: 3 },
        { muscle_group: 'hamstrings', effort_level: 2 },
        { muscle_group: 'calves', effort_level: 1 },
      ],
      reactions: [
        { user_id: 'demo-ryan', type: 'fire' },
        { user_id: 'demo-marcus', type: 'five' },
        { user_id: 'demo-jonas', type: 'five' },
      ],
      comment_count: 1,
    },
    {
      id: 'demo-post-marcus',
      user_id: 'demo-marcus',
      group_id: CREW.id,
      photo_url: null,
      caption: 'No photo — hotel gym, one dumbbell rack, still counted.',
      workout_label: 'Pull',
      strain: 5.6,
      created_at: daysAgo(1, 19),
      muscles: [
        { muscle_group: 'back', effort_level: 2 },
        { muscle_group: 'biceps', effort_level: 2 },
      ],
      reactions: [{ user_id: 'demo-ryan', type: 'five' }],
      comment_count: 0,
    },
    {
      id: 'demo-post-jonas',
      user_id: 'demo-jonas',
      group_id: CIRCLE.id,
      photo_url: DEMO_PHOTOS.rack,
      caption: 'Deadlift day. Back is fine, hands are not.',
      workout_label: 'Deadlift',
      strain: 11.2,
      created_at: hoursAgoToday(7),
      muscles: [
        { muscle_group: 'back', effort_level: 3 },
        { muscle_group: 'hamstrings', effort_level: 3 },
        { muscle_group: 'glutes', effort_level: 2 },
      ],
      reactions: [{ user_id: 'demo-devon', type: 'fire' }],
      comment_count: 2,
    },
  ];
}

const store = {
  profiles: [...cast],
  groups: [CREW, CIRCLE],
  rows: seedRows(),
};

/* --------------------------------------------------------------- listeners -- */

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Stands in for the Supabase realtime channel. `useFeed` subscribes to this in
 * demo mode so a posted check-in reaches the feed the same way a confirmed
 * insert would — without it the optimistic card is dropped and never replaced.
 */
export function subscribeDemo(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

/* -------------------------------------------------------------------------- */
/* Read API                                                                   */
/* -------------------------------------------------------------------------- */

export function demoProfile(userId: string): Profile | null {
  return store.profiles.find((p) => p.id === userId) ?? null;
}

export function demoGroups(userId: string): Group[] {
  return store.groups
    .filter((g) => (roster[g.id] ?? []).includes(userId))
    .map((g) => ({ ...g, member_count: roster[g.id]?.length ?? 1 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function demoCreateGroup(name: string, emblem: string, ownerId: string): Group {
  const group: Group = {
    id: `demo-group-${store.groups.length + 1}`,
    name,
    emblem,
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    member_count: 1,
  };
  store.groups = [...store.groups, group];
  roster[group.id] = [ownerId];
  emit();
  return group;
}

export function demoPendingMembers(
  groupId: string,
  postedUserIds: string[],
): Array<Pick<Profile, 'id' | 'username' | 'avatar_url'>> {
  const posted = new Set(postedUserIds);
  return (roster[groupId] ?? [])
    .filter((id) => !posted.has(id))
    .map((id) => store.profiles.find((p) => p.id === id))
    .filter((p): p is Profile => Boolean(p))
    .map(({ id, username, avatar_url }) => ({ id, username, avatar_url }));
}

export function demoFeed(groupId: string, viewerId: string): FeedItem[] {
  return store.rows
    .filter((r) => r.group_id === groupId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => shape(row, viewerId));
}

function shape(row: DemoRow, viewerId: string): FeedItem {
  const counts: Record<ReactionType, number> = { fire: 0, five: 0 };
  const mine: Record<ReactionType, boolean> = { fire: false, five: false };

  for (const r of row.reactions) {
    counts[r.type] += 1;
    if (r.user_id === viewerId) mine[r.type] = true;
  }

  const profile = store.profiles.find((p) => p.id === row.user_id);

  return {
    id: row.id,
    user_id: row.user_id,
    group_id: row.group_id,
    photo_url: row.photo_url,
    caption: row.caption,
    workout_label: row.workout_label,
    strain: row.strain,
    created_at: row.created_at,
    profile: profile
      ? {
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          streak_count: profile.streak_count,
        }
      : { id: row.user_id, username: 'athlete', avatar_url: null, streak_count: 0 },
    muscles: row.muscles,
    counts,
    mine,
    comment_count: row.comment_count,
  };
}

/* -------------------------------------------------------------------------- */
/* Write API                                                                  */
/* -------------------------------------------------------------------------- */

export function demoToggleReaction(
  checkInId: string,
  userId: string,
  type: ReactionType,
  nextOn: boolean,
): void {
  const row = store.rows.find((r) => r.id === checkInId);
  if (!row) return;

  row.reactions = row.reactions.filter((r) => !(r.user_id === userId && r.type === type));
  if (nextOn) row.reactions.push({ user_id: userId, type });
  // No emit(): the caller already applied this optimistically, and re-rendering
  // from the store here would fight that update.
}

export interface DemoPostArgs {
  groupId: string;
  photoUrl: string | null;
  caption: string;
  workoutLabel: string;
  strain: number;
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
}

export function demoPostCheckIn(args: DemoPostArgs): CheckIn {
  const today = new Date().toDateString();
  const already = store.rows.some(
    (r) =>
      r.user_id === DEMO_USER_ID &&
      r.group_id === args.groupId &&
      new Date(r.created_at).toDateString() === today,
  );
  // Mirrors check_ins_one_per_day_idx in the migration.
  if (already) throw new Error('You have already checked in with this group today.');

  const row: DemoRow = {
    id: `demo-post-${Date.now()}`,
    user_id: DEMO_USER_ID,
    group_id: args.groupId,
    photo_url: args.photoUrl,
    caption: args.caption || null,
    workout_label: args.workoutLabel || null,
    strain: args.strain,
    created_at: new Date().toISOString(),
    muscles: Object.entries(args.effort).map(([muscle_group, effort_level]) => ({
      muscle_group: muscle_group as MuscleGroup,
      effort_level: effort_level as EffortLevel,
    })),
    reactions: [],
    comment_count: 0,
  };

  store.rows = [row, ...store.rows];

  // Same streak bump the migration's trigger performs.
  const me = store.profiles.find((p) => p.id === DEMO_USER_ID);
  if (me) me.streak_count += 1;

  emit();

  const { muscles: _m, reactions: _r, comment_count: _c, ...checkIn } = row;
  return checkIn;
}

/** In demo mode the local file:// (or blob:) URI is already displayable. */
export function demoUploadPhoto(localUri: string): string {
  return localUri;
}
