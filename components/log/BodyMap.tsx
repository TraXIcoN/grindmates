import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';

import { MUSCLES } from '@/lib/muscles';
import { alpha, color, tierColor } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

const BOX_W = 120;
const BOX_H = 246;

/** Zoom factor when a region is focused. */
const ZOOM = 1.8;
/** One timing curve for the whole map — settle, no overshoot. */
const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };

interface Props {
  side: 'front' | 'back';
  effort: Partial<Record<MuscleGroup, EffortLevel>>;
  /** The region currently zoomed in on, if any. */
  focus?: MuscleGroup | null;
  onPick: (muscle: MuscleGroup) => void;
  width?: number;
}

/**
 * Minimal silhouette assembled from primitives — no anatomical illustration,
 * just enough of a figure to place the ten regions against. The silhouette is
 * decorative; MuscleRegion overlays are the tap targets.
 *
 * Focusing a region zooms the whole figure toward it (translate-then-scale,
 * one 220ms ease-out — RN hit testing follows the transform, so the regions
 * stay tappable while zoomed). Every region key has x=50 in the data, so only
 * the vertical translation ever moves.
 */
export function BodyMap({ side, effort, focus, onPick, width = 148 }: Props) {
  const height = (width / BOX_W) * BOX_H;
  const regions = MUSCLES.filter((m) => m.side === side);

  const scale = useSharedValue(1);
  const shiftY = useSharedValue(0);

  useEffect(() => {
    const meta = focus ? MUSCLES.find((m) => m.key === focus) : null;
    const active = meta && meta.side === side ? meta : null;

    const s = active ? ZOOM : 1;
    // Bring the region centre to the container centre, clamped so the figure
    // always covers the frame (no empty band above the head or below the feet).
    const maxShift = ((s - 1) * height) / 2;
    const raw = active ? -s * ((active.y - 50) / 100) * height : 0;
    const target = Math.max(-maxShift, Math.min(maxShift, raw));

    scale.value = withTiming(s, TIMING);
    shiftY.value = withTiming(target, TIMING);
  }, [focus, side, height, scale, shiftY]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shiftY.value }, { scale: scale.value }],
  }));

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={[{ width, height }, zoomStyle]}>
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
            focused={focus === m.key}
            dimmed={!!focus && focus !== m.key}
            boxWidth={width}
            boxHeight={height}
            onPress={() => onPick(m.key)}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function MuscleRegion({
  meta,
  tier,
  focused,
  dimmed,
  boxWidth,
  boxHeight,
  onPress,
}: {
  meta: (typeof MUSCLES)[number];
  tier?: EffortLevel;
  focused: boolean;
  dimmed: boolean;
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
      accessibilityState={{ selected: !!tier, expanded: focused }}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.region,
        { left, top, width: w, height: h, opacity: dimmed ? 0.35 : 1 },
        tint
          ? { backgroundColor: alpha(tint, 0.32), borderColor: tint }
          : { backgroundColor: 'transparent', borderColor: alpha(color.textTertiary, 0.22) },
        focused && !tint ? { borderColor: alpha(color.accent, 0.7) } : null,
        focused ? styles.regionFocused : null,
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
  regionFocused: {
    borderWidth: 1.5,
  },
  tierGlyph: {
    fontSize: 11,
    fontWeight: '900',
  },
});
