import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckInPhoto } from '@/components/feed/CheckInPhoto';
import { MuscleStrip } from '@/components/feed/MuscleStrip';
import { PosterRow } from '@/components/feed/PosterRow';
import { ReactionBar } from '@/components/feed/ReactionBar';
import { border, color, layout, radius } from '@/lib/theme';
import { timeAgo } from '@/lib/time';
import type { FeedItem, ReactionType } from '@/lib/types';

interface Props {
  item: FeedItem;
  isMe: boolean;
  onReact: (checkInId: string, type: ReactionType) => void;
  onOpenPhoto?: (item: FeedItem) => void;
  onComment?: (item: FeedItem) => void;
}

/**
 * card: bgRaised · 1px border faint · radius 20 · overflow hidden · gap 16
 * Optimistic rows render at 55% until the insert lands.
 */
function FeedCardBase({ item, isMe, onReact, onOpenPhoto, onComment }: Props) {
  const meta = `${timeAgo(item.created_at)} · Day ${item.profile.streak_count || 1}`;

  return (
    <View style={[styles.card, item.pending && styles.pending]}>
      <PosterRow
        username={isMe ? 'You' : item.profile.username}
        avatarUrl={item.profile.avatar_url}
        meta={meta}
        streakLive={item.profile.streak_count > 0}
        badge={item.strain !== null && item.strain >= 18 ? 'PR' : null}
      />

      <CheckInPhoto
        uri={item.photo_url}
        fallbackCaption={item.caption}
        onPress={() => onOpenPhoto?.(item)}
      >
        <MuscleStrip muscles={item.muscles} />
      </CheckInPhoto>

      <ReactionBar
        fireCount={item.counts.fire}
        fiveCount={item.counts.five}
        commentCount={item.comment_count}
        fireOn={item.mine.fire}
        fiveOn={item.mine.five}
        workoutLabel={item.workout_label}
        onReact={(t) => onReact(item.id, t)}
        onComment={() => onComment?.(item)}
      />
    </View>
  );
}

export const FeedCard = memo(FeedCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: layout.cardGap,
  },
  pending: { opacity: 0.55 },
});
