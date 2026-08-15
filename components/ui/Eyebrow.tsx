import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';

/**
 * "TODAY · 6 OF 8 CHECKED IN" — a glowing accent dot plus a tracked 11·700
 * label. Used as the feed's only section header.
 */
export function Eyebrow({ text, dot = true }: { text: string; dot?: boolean }) {
  return (
    <View style={styles.row}>
      {dot ? <View style={styles.dot} /> : null}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.accent,
    shadowColor: color.accent,
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  text: {
    fontSize: type.eyebrow.fontSize,
    fontWeight: type.eyebrow.fontWeight,
    letterSpacing: 1.76,
    color: color.muted,
  },
});
