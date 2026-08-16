import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Timer } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckInFab } from '@/components/feed/CheckInFab';
import { ComposerSheet } from '@/components/feed/ComposerSheet';
import { CreateGroupSheet } from '@/components/feed/CreateGroupSheet';
import { FeedCard } from '@/components/feed/FeedCard';
import { GroupSwitcher } from '@/components/feed/GroupSwitcher';
import { NudgeCard } from '@/components/feed/NudgeCard';
import { StreakBadge } from '@/components/feed/StreakBadge';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useApp } from '@/hooks/useApp';
import { useFeed } from '@/hooks/useFeed';
import { fetchPendingMembers } from '@/lib/api';
import { alpha, border, color, layout, radius } from '@/lib/theme';
import { isToday } from '@/lib/time';
import type { FeedItem, Profile } from '@/lib/types';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    session,
    profile,
    groups,
    activeGroup,
    setActiveGroup,
    patchDraft,
    resetDraft,
    optimistic,
    postError,
    setPostError,
  } = useApp();

  const viewerId = session?.user?.id ?? null;
  const { items, refreshing, reload, react, checkedInUserIds } = useFeed(
    activeGroup?.id ?? null,
    viewerId,
  );

  // Just-posted check-ins ride above the fetched rows until the server confirms.
  const rows = useMemo(
    () => [...optimistic.filter((o) => o.group_id === activeGroup?.id), ...items],
    [optimistic, items, activeGroup],
  );

  const [composerOpen, setComposerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<Array<Pick<Profile, 'id' | 'username' | 'avatar_url'>>>([]);

  // Who still owes today's snap — drives the nudge card and the eyebrow count.
  useEffect(() => {
    if (!activeGroup) {
      setPending([]);
      return;
    }
    let alive = true;
    // You can see who you owe — you cannot owe yourself a nudge.
    fetchPendingMembers(activeGroup.id, viewerId ? [...checkedInUserIds, viewerId] : checkedInUserIds)
      .then((rows) => alive && setPending(rows))
      .catch(() => alive && setPending([]));
    return () => {
      alive = false;
    };
  }, [activeGroup, checkedInUserIds, viewerId]);

  const todayCount = useMemo(() => rows.filter((i) => isToday(i.created_at)).length, [rows]);
  const memberCount = activeGroup?.member_count ?? todayCount;

  const openCamera = useCallback(() => {
    setComposerOpen(false);
    resetDraft();
    router.push('/(app)/camera');
  }, [router, resetDraft]);

  const openLibrary = useCallback(async () => {
    setComposerOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (result.canceled) return;
    resetDraft();
    patchDraft({ photoUri: result.assets[0].uri });
    router.push('/(app)/log');
  }, [router, patchDraft, resetDraft]);

  const skipPhoto = useCallback(() => {
    setComposerOpen(false);
    resetDraft();
    router.push('/(app)/log');
  }, [router, resetDraft]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard item={item} isMe={item.user_id === viewerId} onReact={react} />
    ),
    [react, viewerId],
  );

  return (
    <View style={styles.screen}>
      <AmbientGlow />

      {/* Top bar — group switcher opposite the streak. */}
      <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
        <GroupSwitcher
          groups={groups}
          active={activeGroup}
          onSelect={setActiveGroup}
          onCreate={() => setCreateOpen(true)}
        />

        <View style={styles.barRight}>
          <Pressable
            accessibilityLabel="Rest timer"
            onPress={() => router.push('/(app)/timer')}
            hitSlop={10}
            style={({ pressed }) => [styles.timerBtn, pressed && { backgroundColor: color.surfaceHi }]}
          >
            <Timer size={17} color={color.textTertiary} strokeWidth={2} />
          </Pressable>
          <Pressable accessibilityLabel="Your streak and progress" onPress={() => router.push('/(app)/(tabs)/progress')}>
            <StreakBadge count={profile?.streak_count ?? 0} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        initialNumToRender={3}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={color.muted}
          />
        }
        ListHeaderComponent={
          <>
            {postError ? (
              <Pressable style={styles.banner} onPress={() => setPostError(null)}>
                <Text style={styles.bannerText}>{postError}</Text>
                <Text style={styles.bannerDismiss}>Dismiss</Text>
              </Pressable>
            ) : null}
            <Eyebrow
              text={
                activeGroup
                  ? `TODAY · ${todayCount} OF ${memberCount} CHECKED IN`
                  : 'NO GROUP YET'
              }
            />
          </>
        }
        ListFooterComponent={
          <NudgeCard members={pending} onNudge={() => setComposerOpen(false)} />
        }
        ListEmptyComponent={
          <EmptyFeed hasGroup={!!activeGroup} onCreate={() => setCreateOpen(true)} />
        }
      />

      <CheckInFab
        label={activeGroup ? 'Check in' : 'Start a crew'}
        onPress={() => (activeGroup ? setComposerOpen(true) : setCreateOpen(true))}
      />

      <ComposerSheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCamera={openCamera}
        onLibrary={() => void openLibrary()}
        onSkipPhoto={skipPhoto}
      />

      <CreateGroupSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}

function EmptyFeed({ hasGroup, onCreate }: { hasGroup: boolean; onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {hasGroup ? 'Nobody has checked in yet.' : 'No crew yet.'}
      </Text>
      <Text style={styles.emptyBody}>
        {hasGroup
          ? 'Be the one who sets the pace — hit Check in below.'
          : 'Grindmates runs on small closed crews. Start yours, then bring 4–12 people in.'}
      </Text>
      {!hasGroup ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCreate}
          style={({ pressed }) => [styles.emptyCta, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Text style={styles.emptyCtaText}>Create a crew</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
    backgroundColor: alpha(color.bg, 0.96),
    zIndex: 5,
  },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: border.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: layout.firstCardTop - 8,
    paddingBottom: 132,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.menu,
    backgroundColor: alpha(color.tier3, 0.12),
    borderWidth: 1,
    borderColor: alpha(color.tier3, 0.3),
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18, color: color.ember },
  bannerDismiss: { fontSize: 12, fontWeight: '700', color: color.textTertiary },

  empty: {
    paddingVertical: 56,
    paddingHorizontal: 8,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.34, color: color.text },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: color.muted,
    maxWidth: 260,
  },
  emptyCta: {
    marginTop: 18,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: border.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { fontSize: 13.5, fontWeight: '700', color: color.text },
});
