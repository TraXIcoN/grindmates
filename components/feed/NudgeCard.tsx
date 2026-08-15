import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { alpha, border, color, radius } from '@/lib/theme';

interface Props {
  members: Array<{ id: string; username: string; avatar_url: string | null }>;
  onNudge: () => void;
}

/**
 * "2 still owe today's snap" — dashed card, stacked 26pt avatars overlapping
 * by 9, lime text action.
 */
export function NudgeCard({ members, onNudge }: Props) {
  if (members.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.stack}>
        {members.slice(0, 3).map((m, i) => (
          <View key={m.id} style={i > 0 ? { marginLeft: -9 } : undefined}>
            {/* 26px, flat surface fill, 10·800 muted initials, ground-coloured
                ring so the stack reads as separated discs. */}
            <Avatar
              username={m.username}
              url={m.avatar_url}
              size={26}
              ringColor={color.bg}
              ringWidth={1.5}
              background={color.surface}
              glyphSize={10}
              glyphColor={color.muted}
            />
          </View>
        ))}
      </View>

      <Text style={styles.text}>
        {members.length} still {members.length === 1 ? 'owes' : 'owe'} today&apos;s snap
      </Text>

      <Pressable
        hitSlop={12}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onNudge();
        }}
      >
        <Text style={styles.action}>Nudge</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.menu,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: border.dashed,
    backgroundColor: alpha(color.surface, 0.35),
  },
  stack: { flexDirection: 'row' },
  text: { flex: 1, fontSize: 12.5, fontWeight: '600', color: color.muted },
  action: { fontSize: 12, fontWeight: '700', color: color.accent },
});
