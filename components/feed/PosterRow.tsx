import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { KebabIcon } from '@/components/ui/icons';
import { alpha, color, type } from '@/lib/theme';

interface Props {
  username: string;
  avatarUrl: string | null;
  /** "2h ago · Day 41" */
  meta: string;
  /** Lime ring + lime initials when the poster's streak is live. */
  streakLive?: boolean;
  /** Small lime chip beside the name. */
  badge?: string | null;
  onMore?: () => void;
}

/** avatar · name (+badge) · ago — padding 13/14/11, gap 10. */
export function PosterRow({ username, avatarUrl, meta, streakLive, badge, onMore }: Props) {
  return (
    <View style={styles.row}>
      <Avatar username={username} url={avatarUrl} ringed={streakLive} />

      <View style={styles.center}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {username}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{meta}</Text>
      </View>

      <Pressable hitSlop={12} onPress={onMore} accessibilityLabel="More options">
        <KebabIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 13,
    paddingHorizontal: 14,
    paddingBottom: 11,
  },
  center: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: type.name.fontSize,
    fontWeight: '700',
    letterSpacing: -0.14,
    color: color.text,
    flexShrink: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: alpha(color.accent, 0.14),
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.76,
    color: color.accentHi,
  },
  meta: {
    fontSize: 11.5,
    fontWeight: '500',
    color: color.muted,
    marginTop: 1,
  },
});
