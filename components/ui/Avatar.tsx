import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { initials } from '@/lib/time';
import { color } from '@/lib/theme';

interface AvatarProps {
  username: string;
  url?: string | null;
  size?: number;
  /** A live streak rings the avatar in lime; otherwise slate. */
  ringed?: boolean;
  /** Border colour override (used by the stacked nudge avatars). */
  ringColor?: string;
  ringWidth?: number;
  /** Fill override — the nudge stack uses flat surface, not the slate gradient. */
  background?: string;
  /** Initials size/colour override. Defaults scale with `size`. */
  glyphSize?: number;
  glyphColor?: string;
}

/**
 * 34pt circle, gradient slate fill, initials in 12·800.
 * Ring is 1.5px — lime when the poster's streak is live, slate-600 otherwise.
 */
export function Avatar({
  username,
  url,
  size = 34,
  ringed = false,
  ringColor,
  ringWidth = 1.5,
  background,
  glyphSize,
  glyphColor,
}: AvatarProps) {
  const ring = ringColor ?? (ringed ? color.accent : color.slate600);
  const glyphTint = glyphColor ?? (ringed ? color.accent : color.textTertiary);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: ring,
          backgroundColor: background ?? color.slate700,
        },
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <Text style={[styles.glyph, { fontSize: glyphSize ?? size * 0.353, color: glyphTint }]}>
          {initials(username)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // linear-gradient(135deg,#334155,#1E293B) flattened — the gradient reads as
    // a single tone at 34pt, and this keeps the card free of an extra layer.
    backgroundColor: color.slate700,
  },
  glyph: {
    fontWeight: '800',
  },
});
