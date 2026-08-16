import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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
 * Every network call site checks this first and works against the in-memory
 * store below instead, so `npx expo start` and the static web build work with
 * zero setup. There is no fake cast and no seeded feed: a visitor walks the
 * same path a real user would — create an account, start a crew, post.
 *
 * The moment EXPO_PUBLIC_SUPABASE_URL points at a real project, every one of
 * those branches switches off and nothing in this file runs again.
 */
export const DEMO = !configuredUrl || configuredUrl.includes('YOUR-PROJECT');

export const DEMO_USER_ID = 'demo-you';

/* -------------------------------------------------------------------------- */
/* Store — starts empty                                                       */
/* -------------------------------------------------------------------------- */

interface DemoRow extends CheckIn {
  muscles: Array<{ muscle_group: MuscleGroup; effort_level: EffortLevel }>;
  reactions: Array<{ user_id: string; type: ReactionType }>;
  comment_count: number;
}

const store = {
  signedIn: false,
  profiles: [] as Profile[],
  groups: [] as Group[],
  rows: [] as DemoRow[],
};

/** group id -> member ids. */
let roster: Record<string, string[]> = {};

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORE_KEY = 'grindmates.demo.v1';

let hydrated = false;

/**
 * Loads the persisted store before the first render decides where to send the
 * user. This is what makes an account survive a reload: the session flag, the
 * profile, crews, and every check-in come back exactly as they were left.
 * AsyncStorage is backed by localStorage on web and native storage elsewhere.
 */
export async function hydrateDemo(): Promise<boolean> {
  if (!DEMO || hydrated) return store.signedIn;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<typeof store> & {
        roster?: Record<string, string[]>;
      };
      store.signedIn = !!saved.signedIn;
      store.profiles = saved.profiles ?? [];
      store.groups = saved.groups ?? [];
      store.rows = saved.rows ?? [];
      roster = saved.roster ?? {};
    }
  } catch {
    // A corrupt blob should never brick the app — start clean instead.
  }
  return store.signedIn;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced write-behind; every mutation below calls this. */
function persist(): void {
  if (!DEMO) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void AsyncStorage.setItem(STORE_KEY, JSON.stringify({ ...store, roster })).catch(() => {});
  }, 120);
}

/**
 * Signing out flips the flag but keeps the data, so signing back in retrieves
 * everything that was ever logged under this account.
 */
export function setDemoSignedIn(value: boolean): void {
  store.signedIn = value;
  persist();
}

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
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Creates the local profile on sign-up (or first sign-in). `overwriteName`
 * distinguishes "create account" — which owns the username — from a later
 * sign-in, which must not clobber it.
 */
export function ensureDemoProfile(username: string, overwriteName = false): Profile {
  let me = store.profiles.find((p) => p.id === DEMO_USER_ID);
  if (!me) {
    me = {
      id: DEMO_USER_ID,
      username: username.trim() || 'you',
      avatar_url: null,
      streak_count: 0,
      created_at: new Date().toISOString(),
    };
    store.profiles.push(me);
  } else if (overwriteName && username.trim()) {
    me.username = username.trim();
  }
  persist();
  return me;
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

/** 8 digits, zero-padded — easy to read out across a gym floor. */
function newJoinCode(): string {
  let code = String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0');
  while (store.groups.some((g) => g.join_code === code)) {
    code = String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0');
  }
  return code;
}

export function demoCreateGroup(name: string, emblem: string, ownerId: string): Group {
  const group: Group = {
    id: `demo-group-${Date.now()}`,
    name,
    emblem,
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    member_count: 1,
    join_code: newJoinCode(),
  };
  store.groups = [...store.groups, group];
  roster[group.id] = [ownerId];
  persist();
  emit();
  return group;
}

export function demoJoinGroup(code: string, userId: string): Group {
  const digits = code.replace(/\D/g, '');
  const group = store.groups.find((g) => g.join_code === digits);
  if (!group) {
    // Honest about the demo's limits: another person's crew lives in their
    // browser, not in a shared backend, so their code cannot resolve here.
    throw new Error('No crew found with that code.');
  }
  const members = roster[group.id] ?? [];
  if (members.includes(userId)) {
    throw new Error('You are already in this crew.');
  }
  roster[group.id] = [...members, userId];
  persist();
  emit();
  return { ...group, member_count: roster[group.id].length };
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
  persist();
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

  persist();
  emit();

  const { muscles: _m, reactions: _r, comment_count: _c, ...checkIn } = row;
  return checkIn;
}

/** In demo mode the local file:// (or blob:) URI is already displayable. */
export function demoUploadPhoto(localUri: string): string {
  return localUri;
}
