import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alpha, color, layout } from '@/lib/theme';

interface Props {
  uri: string | null;
  /** Shown when a member logged without a photo. */
  fallbackCaption?: string | null;
  onPress?: () => void;
  children?: ReactNode;
}

/**
 * 342pt tall on the 402pt frame. Bottom scrim is a 118pt gradient to
 * bg@86% so the muscle tags always read against a bright photo.
 */
export function CheckInPhoto({ uri, fallbackCaption, onPress, children }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!uri} style={styles.frame}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoText}>{fallbackCaption?.trim() || 'Logged without a photo'}</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', alpha(color.bg, 0.86)]}
        style={styles.scrim}
        pointerEvents="none"
      />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    width: '100%',
    height: layout.photoHeight,
    backgroundColor: color.photoBg,
  },
  noPhoto: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noPhotoText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    color: color.textTertiary,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 118,
  },
});
