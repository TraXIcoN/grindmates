import {
  DEMO,
  DEMO_USER_ID,
  demoCreateGroup,
  demoFeed,
  demoGroups,
  demoJoinGroup,
  demoPendingMembers,
  demoPostCheckIn,
  demoProfile,
  demoToggleReaction,
} from './demo';
import { supabase } from './supabase';
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
/* Profiles & groups                                                          */
/* -------------------------------------------------------------------------- */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (DEMO) return demoProfile(userId);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchMyGroups(userId: string): Promise<Group[]> {
  if (DEMO) return demoGroups(userId);

  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, emblem, owner_id, created_at, join_code)')
    .eq('user_id', userId);
  if (error) throw error;

  const groups = (data ?? [])
    .map((row) => (row as unknown as { groups: Group | null }).groups)
    .filter((g): g is Group => Boolean(g));

  if (groups.length === 0) return [];

  // Roster sizes drive the "6 OF 8 CHECKED IN" line and the switcher counts.
  const { data: counts, error: countErr } = await supabase
    .from('group_members')
    .select('group_id')
    .in(
      'group_id',
      groups.map((g) => g.id),
    );
  if (countErr) throw countErr;

  const tally = new Map<string, number>();
  for (const row of counts ?? []) {
    const id = (row as { group_id: string }).group_id;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }

  return groups
    .map((g) => ({ ...g, member_count: tally.get(g.id) ?? 1 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createGroup(name: string, emblem: string, ownerId: string): Promise<Group> {
  if (DEMO) return demoCreateGroup(name, emblem, ownerId);

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, emblem, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as Group), member_count: 1 };
}

/**
 * Join a crew by its 8-digit code. Runs through a SECURITY DEFINER function
 * (migration 0002) because the joiner can neither see the group row nor insert
 * their own membership under RLS before they are a member.
 */
export async function joinGroup(code: string): Promise<Group> {
  if (DEMO) return demoJoinGroup(code, DEMO_USER_ID);

  const { data, error } = await supabase
    .rpc('join_group_with_code', { p_code: code })
    .single();
  if (error) {
    if (error.code === 'P0002' || /no crew/i.test(error.message)) {
      throw new Error('No crew found with that code.');
    }
    if (error.code === '23505' || /already/i.test(error.message)) {
      throw new Error('You are already in this crew.');
    }
    throw error;
  }
  return data as Group;
}

/** Members of a group who have NOT checked in today — powers the nudge card. */
export async function fetchPendingMembers(
  groupId: string,
  postedUserIds: string[],
): Promise<Array<Pick<Profile, 'id' | 'username' | 'avatar_url'>>> {
  if (DEMO) return demoPendingMembers(groupId, postedUserIds);

  const { data, error } = await supabase
    .from('group_members')
    .select('profiles(id, username, avatar_url)')
    .eq('group_id', groupId);
  if (error) throw error;

  const posted = new Set(postedUserIds);
  return (data ?? [])
    .map((r) => (r as unknown as { profiles: Profile | null }).profiles)
    .filter((p): p is Profile => Boolean(p) && !posted.has(p!.id))
    .map(({ id, username, avatar_url }) => ({ id, username, avatar_url }));
}

/* -------------------------------------------------------------------------- */
/* Feed                                                                       */
/* -------------------------------------------------------------------------- */

interface RawFeedRow extends CheckIn {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'streak_count'> | null;
  muscle_logs: Array<{ muscle_group: MuscleGroup; effort_level: string }> | null;
  reactions: Array<{ user_id: string; type: ReactionType }> | null;
}

const FEED_SELECT = `
  id, user_id, group_id, photo_url, caption, workout_label, strain, created_at,
  profiles!check_ins_user_id_fkey ( id, username, avatar_url, streak_count ),
  muscle_logs ( muscle_group, effort_level ),
  reactions ( user_id, type )
`;

/** Chronological, today-first. Small closed groups, so one page is the feed. */
export async function fetchFeed(groupId: string, viewerId: string): Promise<FeedItem[]> {
  if (DEMO) return demoFeed(groupId, viewerId);

  const { data, error } = await supabase
    .from('check_ins')
    .select(FEED_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data as unknown as RawFeedRow[]).map((row) => shapeFeedItem(row, viewerId));
}

function shapeFeedItem(row: RawFeedRow, viewerId: string): FeedItem {
  const counts: Record<ReactionType, number> = { fire: 0, five: 0 };
  const mine: Record<ReactionType, boolean> = { fire: false, five: false };

  for (const r of row.reactions ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (r.user_id === viewerId) mine[r.type] = true;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    group_id: row.group_id,
    photo_url: row.photo_url,
    caption: row.caption,
    workout_label: row.workout_label,
    strain: row.strain,
    created_at: row.created_at,
    profile: row.profiles ?? {
      id: row.user_id,
      username: 'athlete',
      avatar_url: null,
      streak_count: 0,
    },
    muscles: (row.muscle_logs ?? []).map((m) => ({
      muscle_group: m.muscle_group,
      effort_level: Number(m.effort_level) as EffortLevel,
    })),
    counts,
    mine,
    comment_count: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Posting                                                                    */
/* -------------------------------------------------------------------------- */

export interface PostCheckInArgs {
  /** The author comes from auth.uid() inside the function, not the client. */
  groupId: string;
  photoUrl: string | null;
  caption: string;
  workoutLabel: string;
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
}

/**
 * Posts the check-in and its muscle logs in a single transaction (see the
 * post_check_in function in the migration). Doing it as two inserts would let
 * the feed's realtime listener fetch the new row before the muscle logs exist,
 * rendering a card with an empty muscle strip.
 */
export async function postCheckIn(args: PostCheckInArgs): Promise<CheckIn> {
  if (DEMO) {
    return demoPostCheckIn({
      groupId: args.groupId,
      photoUrl: args.photoUrl,
      caption: args.caption,
      workoutLabel: args.workoutLabel,
      strain: strainFrom(args.effort),
      effort: args.effort,
    });
  }

  const muscles = Object.entries(args.effort).map(([muscle_group, effort_level]) => ({
    muscle_group: muscle_group as MuscleGroup,
    effort_level: String(effort_level),
  }));

  const { data, error } = await supabase
    .rpc('post_check_in', {
      p_group_id: args.groupId,
      p_photo_url: args.photoUrl,
      p_caption: args.caption,
      p_workout_label: args.workoutLabel,
      p_strain: strainFrom(args.effort),
      p_muscles: muscles,
    })
    .single();

  if (error) {
    // 23505 on check_ins_one_per_day_idx = already posted today.
    if (error.code === '23505') {
      throw new Error('You have already checked in with this group today.');
    }
    throw error;
  }

  return data as CheckIn;
}

/**
 * Strain, 0–21 (the open question in the design doc — this is the current
 * answer). Each tagged group contributes its tier; the sum is capped at 21 so
 * the ring never overdraws.
 */
export function strainFrom(effort: Partial<Record<MuscleGroup, EffortLevel>>): number {
  const raw = Object.values(effort).reduce<number>((sum, tier) => sum + (tier ?? 0), 0);
  return Math.min(21, Math.round(raw * 1.4 * 10) / 10);
}

/* -------------------------------------------------------------------------- */
/* Reactions                                                                  */
/* -------------------------------------------------------------------------- */

export async function toggleReaction(
  checkInId: string,
  userId: string,
  type: ReactionType,
  nextOn: boolean,
): Promise<void> {
  if (DEMO) {
    demoToggleReaction(checkInId, userId, type, nextOn);
    return;
  }

  if (nextOn) {
    const { error } = await supabase
      .from('reactions')
      .insert({ check_in_id: checkInId, user_id: userId, type });
    // 23505 = already reacted; the optimistic state was already correct.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('check_in_id', checkInId)
      .eq('user_id', userId)
      .eq('type', type);
    if (error) throw error;
  }
}
