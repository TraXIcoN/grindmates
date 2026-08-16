import React, { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { alpha, border, color, radius } from '@/lib/theme';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Bottom padding — 44 on the composer to clear the home indicator. */
  bottomPad?: number;
}

/**
 * Bottom sheet. Scrim is bg@72% with a blur-equivalent tint; the panel is
 * bgRaised with a 26/26/0/0 radius and a slate grabber.
 * Slides in on a plain 220ms timing — it settles, it does not bounce.
 */
export function Sheet({ open, onClose, children, bottomPad = 44 }: SheetProps) {
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <Animated.View
          entering={SlideInDown.duration(220)}
          exiting={SlideOutDown.duration(160)}
          style={[styles.panel, { paddingBottom: bottomPad }]}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: alpha(color.scrim, 0.72),
  },
  panel: {
    width: '100%',
    backgroundColor: color.bgRaised,
    borderTopWidth: 1,
    borderTopColor: border.soft,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.slate700,
    alignSelf: 'center',
    marginBottom: 18,
  },
});
