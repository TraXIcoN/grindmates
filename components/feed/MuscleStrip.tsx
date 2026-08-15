import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TierDot } from '@/components/ui/TierDot';
import { MUSCLE_LABEL } from '@/lib/muscles';
import { alpha, color, radius, tierColor, type } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

interface Props {
  muscles: Array<{ muscle_group: MuscleGroup; effort_level: EffortLevel }>;
}

/**
 * Overlaid on the photo rather than in a bottom bar — keeps the card compact
 * and ties effort colour to the image. Each tag carries its tier dot.
 * Tag: padding 6/11/6/8 · radius 999 · bg bgRaised@82% · border tier@40%.
 */
export function MuscleStrip({ muscles }: Props) {
  if (muscles.length === 0) return null;

  return (
    <View style={styles.strip} pointerEvents="none">
      {muscles.map((m) => {
        const tint = tierColor[m.effort_level];
        return (
          <View key={m.muscle_group} style={[styles.tag, { borderColor: alpha(tint, 0.4) }]}>
            <TierDot tier={m.effort_level} />
            <Text style={styles.label}>{MUSCLE_LABEL[m.muscle_group]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 11,
    borderRadius: radius.pill,
    backgroundColor: alpha(color.bgRaised, 0.82),
    borderWidth: 1,
  },
  label: {
    fontSize: type.tag.fontSize,
    fontWeight: '700',
    letterSpacing: -0.12,
    color: color.text,
  },
});
