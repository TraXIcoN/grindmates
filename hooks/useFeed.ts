import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchFeed, toggleReaction } from '@/lib/api';
import { DEMO, subscribeDemo } from '@/lib/demo';
import { supabase } from '@/lib/supabase';
import type { FeedItem, ReactionType } from '@/lib/types';

/**
 * The feed, with optimistic reactions and optimistic post submission.
 *
 * Design rule: minimal loading states. `items` starts empty and fills in; the
 * screen never blocks on a spinner after the first paint.
 */
export function useFeed(groupId: string | null, viewerId: string | null) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!groupId || !viewerId) {
        setItems([]);
        return;
      }
      if (!opts.silent) setRefreshing(true);
      try {
        setItems(await fetchFeed(groupId, viewerId));
        setError(null);
        loadedFor.current = groupId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the feed');
      } finally {
        setRefreshing(false);
      }
    },
    [groupId, viewerId],
  );

  useEffect(() => {
    // Switching groups swaps the list immediately, then reconciles.
    if (loadedFor.current !== groupId) setItems([]);
    void load({ silent: true });
  }, [load, groupId]);

  // Live updates: someone else's check-in or reaction lands while you're looking.
  useEffect(() => {
    if (!groupId) return;

    // Demo mode has no websocket; the in-memory store emits the same signal so
    // a posted check-in replaces its optimistic card the same way.
    if (DEMO) return subscribeDemo(() => void load({ silent: true }));

    const channel = supabase
      .channel(`feed:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins', filter: `group_id=eq.${groupId}` },
        () => void load({ silent: true }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () =>
        void load({ silent: true }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, load]);

  /** Optimistic: flip the pill now, reconcile (or roll back) after the write. */
  const react = useCallback(
    (checkInId: string, type: ReactionType) => {
      if (!viewerId) return;

      // Decide from committed state, not inside the updater: React only runs an
      // updater synchronously on the eager path, so reading a variable it
      // assigns is unreliable the moment another update is already pending.
      const current = items.find((i) => i.id === checkInId);
      if (!current) return;
      const nextOn = !current.mine[type];

      setItems((prev) =>
        prev.map((item) =>
          item.id === checkInId
            ? {
                ...item,
                mine: { ...item.mine, [type]: nextOn },
                counts: { ...item.counts, [type]: item.counts[type] + (nextOn ? 1 : -1) },
              }
            : item,
        ),
      );

      void toggleReaction(checkInId, viewerId, type, nextOn).catch(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === checkInId
              ? {
                  ...item,
                  mine: { ...item.mine, [type]: !nextOn },
                  counts: { ...item.counts, [type]: item.counts[type] + (nextOn ? -1 : 1) },
                }
              : item,
          ),
        );
      });
    },
    [viewerId, items],
  );

  const checkedInUserIds = useMemo(() => {
    const today = new Date().toDateString();
    return items
      .filter((i) => new Date(i.created_at).toDateString() === today)
      .map((i) => i.user_id);
  }, [items]);

  return { items, refreshing, error, reload: load, react, checkedInUserIds };
}
