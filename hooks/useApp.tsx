import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createGroup, fetchMyGroups, fetchProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { EMPTY_DRAFT, type CheckInDraft, type FeedItem, type Group, type Profile } from '@/lib/types';

/**
 * Global app state. One context, no external store — the app has exactly three
 * pieces of cross-screen state: who you are, which group you're looking at, and
 * the check-in you're part-way through composing.
 */
interface AppState {
  /** null while the persisted session is still being read from storage. */
  session: Session | null;
  profile: Profile | null;
  groups: Group[];
  activeGroup: Group | null;
  /** True only until the first auth resolution; the app renders instantly after. */
  booting: boolean;

  setActiveGroup: (group: Group) => void;
  refreshProfile: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  addGroup: (name: string, emblem: string) => Promise<Group | null>;

  /** The in-flight check-in, shared across camera -> log -> post. */
  draft: CheckInDraft;
  patchDraft: (patch: Partial<CheckInDraft>) => void;
  resetDraft: () => void;

  /**
   * Posts that have been submitted but not yet confirmed by the server. The
   * feed renders these above the fetched rows so a check-in appears the instant
   * you tap Post, with no upload wait.
   */
  optimistic: FeedItem[];
  pushOptimistic: (item: FeedItem) => void;
  dropOptimistic: (id: string) => void;

  /**
   * Why the last post failed. Lives here rather than on the log screen because
   * the log screen unmounts the instant you tap Post — a failure has to surface
   * on the feed you were sent back to, or it surfaces nowhere.
   */
  postError: string | null;
  setPostError: (message: string | null) => void;

  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  /**
   * `needsConfirmation` is true when Supabase created the user but withheld a
   * session because email confirmation is on (the default). Navigating in that
   * case would bounce straight back to sign-in with nothing explained.
   */
  signUpWithEmail: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInAnonymously: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const ACTIVE_GROUP_KEY = 'vitals.activeGroupId';

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [draft, setDraft] = useState<CheckInDraft>(EMPTY_DRAFT);
  const [optimistic, setOptimistic] = useState<FeedItem[]>([]);
  const [postError, setPostError] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  /* ---------------------------------------------------------------- auth -- */

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setBooting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setBooting(false);
      if (!next) {
        setProfile(null);
        setGroups([]);
        setActiveGroupId(null);
        setDraft(EMPTY_DRAFT);
        setOptimistic([]);
        setPostError(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------------------------------------- loaders -- */

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setProfile(await fetchProfile(userId));
    } catch (err) {
      console.warn('[vitals] profile load failed', err);
    }
  }, [userId]);

  const refreshGroups = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await fetchMyGroups(userId);
      setGroups(next);
      setActiveGroupId((current) => {
        if (current && next.some((g) => g.id === current)) return current;
        return next[0]?.id ?? null;
      });
    } catch (err) {
      console.warn('[vitals] group load failed', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refreshProfile();
    void refreshGroups();
  }, [userId, refreshProfile, refreshGroups]);

  // Keep the streak badge honest without a refetch after posting.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  /* -------------------------------------------------------------- actions -- */

  const setActiveGroup = useCallback((group: Group) => setActiveGroupId(group.id), []);

  const addGroup = useCallback(
    async (name: string, emblem: string) => {
      if (!userId) return null;
      try {
        const group = await createGroup(name, emblem, userId);
        setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
        setActiveGroupId(group.id);
        return group;
      } catch (err) {
        console.warn('[vitals] group create failed', err);
        return null;
      }
    },
    [userId],
  );

  const patchDraft = useCallback(
    (patch: Partial<CheckInDraft>) => setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );
  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const pushOptimistic = useCallback(
    (item: FeedItem) => setOptimistic((prev) => [item, ...prev]),
    [],
  );
  const dropOptimistic = useCallback(
    (id: string) => setOptimistic((prev) => prev.filter((i) => i.id !== id)),
    [],
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, username: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      return {
        error: error?.message ?? null,
        needsConfirmation: !error && !data.session,
      };
    },
    [],
  );

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  const value = useMemo<AppState>(
    () => ({
      session,
      profile,
      groups,
      activeGroup,
      booting,
      setActiveGroup,
      refreshProfile,
      refreshGroups,
      addGroup,
      draft,
      patchDraft,
      resetDraft,
      optimistic,
      pushOptimistic,
      dropOptimistic,
      postError,
      setPostError,
      signInWithEmail,
      signUpWithEmail,
      signInAnonymously,
      signOut,
    }),
    [
      session,
      profile,
      groups,
      activeGroup,
      booting,
      setActiveGroup,
      refreshProfile,
      refreshGroups,
      addGroup,
      draft,
      patchDraft,
      resetDraft,
      optimistic,
      pushOptimistic,
      dropOptimistic,
      postError,
      setPostError,
      signInWithEmail,
      signUpWithEmail,
      signInAnonymously,
      signOut,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export { ACTIVE_GROUP_KEY };
