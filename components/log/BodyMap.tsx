import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { MUSCLES } from '@/lib/muscles';
import { alpha, color, tierColor } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

const BOX_W = 120;
const BOX_H = 246;

interface Props {
  side: 'front' | 'back';
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
  onPick: (muscle: MuscleGroup) => void;
  width?: number;
}

/**
 * Minimal silhouette assembled from primitives — no anatomical illustration,
 * just enough of a figure to place the ten regions against. The silhouette is
 * decorative; MuscleRegion overlays are the tap targets.
 */
export function BodyMap({ side, effort, onPick, width = 148 }: Props) {
  const height = (width / BOX_W) * BOX_H;
  const regions = MUSCLES.filter((m) => m.side === side);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${BOX_W} ${BOX_H}`}>
        {/* head */}
        <Circle cx={60} cy={20} r={13} fill={color.surface} />
        {/* torso */}
        <Rect x={38} y={38} width={44} height={62} rx={14} fill={color.surface} />
        {/* hips */}
        <Rect x={42} y={98} width={36} height={26} rx={10} fill={color.surface} />
        {/* arms */}
        <Rect x={18} y={42} width={16} height={72} rx={8} fill={color.surface} />
        <Rect x={86} y={42} width={16} height={72} rx={8} fill={color.surface} />
        {/* thighs */}
        <Rect x={40} y={124} width={17} height={62} rx={8} fill={color.surface} />
        <Rect x={63} y={124} width={17} height={62} rx={8} fill={color.surface} />
        {/* calves */}
        <Rect x={41} y={188} width={15} height={52} rx={7} fill={color.surface} />
        <Rect x={64} y={188} width={15} height={52} rx={7} fill={color.surface} />
      </Svg>

      {regions.map((m) => (
        <MuscleRegion
          key={m.key}
          meta={m}
          tier={effort[m.key]}
          boxWidth={width}
          boxHeight={height}
          onPress={() => onPick(m.key)}
        />
      ))}
    </View>
  );
}

function MuscleRegion({
  meta,
  tier,
  boxWidth,
  boxHeight,
  onPress,
}: {
  meta: (typeof MUSCLES)[number];
  tier?: EffortLevel;
  boxWidth: number;
  boxHeight: number;
  onPress: () => void;
}) {
  const w = (meta.w / 100) * boxWidth;
  const h = (meta.h / 100) * boxHeight;
  const left = (meta.x / 100) * boxWidth - w / 2;
  const top = (meta.y / 100) * boxHeight - h / 2;
  const tint = tier ? tierColor[tier] : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: !!tier }}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.region,
        { left, top, width: w, height: h },
        tint
          ? { backgroundColor: alpha(tint, 0.32), borderColor: tint }
          : { backgroundColor: 'transparent', borderColor: alpha(color.textTertiary, 0.22) },
      ]}
    >
      {tint ? <Text style={[styles.tierGlyph, { color: tint }]}>{tier}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierGlyph: {
    fontSize: 11,
    fontWeight: '900',
  },
});
