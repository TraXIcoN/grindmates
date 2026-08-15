import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyMap } from '@/components/log/BodyMap';
import { EffortSheet } from '@/components/log/EffortSheet';
import { MuscleChip } from '@/components/log/MuscleChip';
import { SelectionSummary } from '@/components/log/SelectionSummary';
import { StickyCta } from '@/components/log/StickyCta';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useApp } from '@/hooks/useApp';
import { postCheckIn, strainFrom } from '@/lib/api';
import { MUSCLES } from '@/lib/muscles';
import { uploadCheckInPhoto } from '@/lib/supabase';
import { border, color, layout, radius, toggleTint, type } from '@/lib/theme';
import type { EffortLevel, FeedItem, MuscleGroup } from '@/lib/types';

/** Tap cycles Light -> Moderate -> Heavy -> off. */
function nextTier(current?: EffortLevel): EffortLevel | undefined {
  if (current === undefined) return 1;
  if (current === 3) return undefined;
  return (current + 1) as EffortLevel;
}

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    session,
    profile,
    activeGroup,
    draft,
    patchDraft,
    resetDraft,
    pushOptimistic,
    dropOptimistic,
    setPostError,
    refreshProfile,
  } = useApp();

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [sheetFor, setSheetFor] = useState<MuscleGroup | null>(null);
  const [busy, setBusy] = useState(false);

  const effort = draft.effort;
  const tagged = useMemo(() => Object.keys(effort).length, [effort]);

  const setTier = useCallback(
    (muscle: MuscleGroup, tier: EffortLevel | undefined) => {
      const next = { ...effort };
      if (tier === undefined) delete next[muscle];
      else next[muscle] = tier;
      patchDraft({ effort: next });
    },
    [effort, patchDraft],
  );

  const cycle = useCallback(
    (muscle: MuscleGroup) => setTier(muscle, nextTier(effort[muscle])),
    [effort, setTier],
  );

  /**
   * Post. The card lands in the feed immediately; the photo upload and the
   * insert run behind it. This screen unmounts as soon as we navigate, so a
   * failure has to be reported through app state — the feed renders it.
   */
  const post = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !activeGroup || busy) return;

    setBusy(true);
    setPostError(null);

    const tempId = `optimistic-${Date.now()}`;
    const snapshot = { ...draft };

    const optimisticItem: FeedItem = {
      id: tempId,
      user_id: userId,
      group_id: activeGroup.id,
      photo_url: snapshot.photoUri,
      caption: snapshot.caption || null,
      workout_label: snapshot.workoutLabel || null,
      strain: strainFrom(snapshot.effort),
      created_at: new Date().toISOString(),
      profile: {
        id: userId,
        username: profile?.username ?? 'You',
        avatar_url: profile?.avatar_url ?? null,
        streak_count: profile?.streak_count ?? 0,
      },
      muscles: (Object.entries(snapshot.effort) as Array<[MuscleGroup, EffortLevel]>).map(
        ([muscle_group, effort_level]) => ({ muscle_group, effort_level }),
      ),
      counts: { fire: 0, five: 0 },
      mine: { fire: false, five: false },
      comment_count: 0,
      pending: true,
    };

    pushOptimistic(optimisticItem);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetDraft();
    router.replace('/(app)/feed');

    try {
      const photoUrl = snapshot.photoUri
        ? await uploadCheckInPhoto(userId, snapshot.photoUri)
        : null;

      await postCheckIn({
        groupId: activeGroup.id,
        photoUrl,
        caption: snapshot.caption,
        workoutLabel: snapshot.workoutLabel,
        effort: snapshot.effort,
      });

      // Realtime hands the confirmed row to the feed; drop the stand-in.
      dropOptimistic(tempId);
      void refreshProfile();
    } catch (err) {
      // Pull the card back out and say why, so a failed post is never mistaken
      // for a successful one.
      dropOptimistic(tempId);
      setPostError(err instanceof Error ? err.message : 'Could not post your check-in.');
    } finally {
      setBusy(false);
    }
  }, [
    session,
    activeGroup,
    busy,
    draft,
    profile,
    pushOptimistic,
    dropOptimistic,
    resetDraft,
    refreshProfile,
    setPostError,
    router,
  ]);

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <ChevronLeft size={20} color={color.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.barTitle}>Log</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>What did you hit today?</Text>

        {draft.photoUri ? (
          <View style={styles.preview}>
            <Image source={{ uri: draft.photoUri }} style={styles.previewImg} contentFit="cover" />
            <Pressable
              onPress={() => patchDraft({ photoUri: null })}
              style={styles.previewClear}
              hitSlop={8}
            >
              <Text style={styles.previewClearText}>Remove photo</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Body map — front/back, with the chip list underneath as the fallback. */}
        <View style={styles.mapRow}>
          <View style={styles.sideToggle}>
            {(['front', 'back'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSide(s);
                }}
                style={[styles.sideBtn, side === s && styles.sideBtnOn]}
              >
                <Text style={[styles.sideLabel, side === s && { color: color.accent }]}>
                  {s === 'front' ? 'FRONT' : 'BACK'}
                </Text>
              </Pressable>
            ))}
          </View>

          <BodyMap side={side} effort={effort} onPick={(m) => setSheetFor(m)} width={150} />
        </View>

        <Text style={styles.sectionLabel}>ALL GROUPS</Text>
        <View style={styles.chips}>
          {MUSCLES.map((m) => (
            <MuscleChip
              key={m.key}
              muscle={m.key}
              label={m.label}
              tier={effort[m.key]}
              onCycle={cycle}
              onLongPress={(muscle) => setSheetFor(muscle)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>NOTE</Text>
        <TextInput
          value={draft.caption}
          onChangeText={(caption) => patchDraft({ caption })}
          placeholder="Chest & triceps, then twenty minutes on the bike."
          placeholderTextColor={color.textFaint}
          style={styles.note}
          multiline
          maxLength={280}
        />

        <TextInput
          value={draft.workoutLabel}
          onChangeText={(workoutLabel) => patchDraft({ workoutLabel })}
          placeholder="Split name — e.g. Push A"
          placeholderTextColor={color.textFaint}
          style={styles.splitInput}
          maxLength={24}
        />

        <View style={{ marginTop: 18 }}>
          <SelectionSummary effort={effort} />
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      <StickyCta
        label={activeGroup ? 'Post to feed' : 'Join a group first'}
        onPress={() => void post()}
        disabled={tagged === 0 || !activeGroup}
        busy={busy}
        bottom={insets.bottom + 20}
      />

      <EffortSheet
        muscle={sheetFor}
        current={sheetFor ? effort[sheetFor] : undefined}
        onPick={(tier) => {
          if (sheetFor) setTier(sheetFor, tier ?? undefined);
          setSheetFor(null);
        }}
        onClose={() => setSheetFor(null)}
      />
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
    paddingBottom: 10,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.textTertiary },

  body: { paddingHorizontal: layout.gutter, paddingTop: 8 },
  title: {
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 31,
    color: color.text,
    maxWidth: 300,
  },

  preview: {
    marginTop: 18,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: color.photoBg,
    borderWidth: 1,
    borderColor: border.faint,
  },
  previewImg: { width: '100%', height: 180 },
  previewClear: { paddingVertical: 11, alignItems: 'center', backgroundColor: color.bgRaised },
  previewClearText: { fontSize: 12.5, fontWeight: '700', color: color.muted },

  mapRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  sideToggle: { flex: 1, gap: 8 },
  sideBtn: {
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnOn: toggleTint(color.accent),
  sideLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: color.textTertiary },

  sectionLabel: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  note: {
    minHeight: 84,
    borderRadius: 14,
    padding: 14,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  splitInput: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
