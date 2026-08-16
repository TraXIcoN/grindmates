import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import { MUSCLES } from '@/lib/muscles';
import { alpha, color, tierColor } from '@/lib/theme';
import type { EffortLevel, MuscleGroup } from '@/lib/types';

const BOX_W = 120;
const BOX_H = 246;

/** Zoom factor when a region is focused. */
const ZOOM = 1.8;
const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };

/** The figure beneath the muscles — quiet, one tone. */
const BODY = alpha(color.surface, 0.55);
/** Resting muscle fill — a step above the body so segmentation reads. */
const MUSCLE = color.surface;
const MUSCLE_EDGE = alpha(color.textTertiary, 0.16);

interface Props {
  side: 'front' | 'back';
  /** Effort mode: tiers paint the regions (the Log screen). */
  effort?: Partial<Record<MuscleGroup, EffortLevel>>;
  /** Select mode: chosen muscles take the accent (the Train tab). */
  selected?: MuscleGroup[];
  /** The region currently zoomed in on, if any. */
  focus?: MuscleGroup | null;
  onPick: (muscle: MuscleGroup) => void;
  width?: number;
}

/**
 * Anatomical body map, drawn from scratch for this app: each muscle group is
 * its own shape on a quiet silhouette, so the figure reads like a lifter's
 * chart rather than a set of boxes. The SVG is the picture; invisible
 * Pressable targets (bilateral for arm muscles) carry the taps and the
 * accessibility labels. Focusing zooms the whole figure — translate then
 * scale, one 220ms ease-out; hit testing follows the transform.
 */
export function BodyMap({ side, effort = {}, selected = [], focus, onPick, width = 168 }: Props) {
  const height = (width / BOX_W) * BOX_H;
  const regions = MUSCLES.filter((m) => m.side === side);

  const scale = useSharedValue(1);
  const shiftY = useSharedValue(0);

  useEffect(() => {
    const meta = focus ? MUSCLES.find((m) => m.key === focus) : null;
    const active = meta && meta.side === side ? meta : null;

    const s = active ? ZOOM : 1;
    const maxShift = ((s - 1) * height) / 2;
    const raw = active ? -s * ((active.y - 50) / 100) * height : 0;
    const target = Math.max(-maxShift, Math.min(maxShift, raw));

    scale.value = withTiming(s, TIMING);
    shiftY.value = withTiming(target, TIMING);
  }, [focus, side, height, scale, shiftY]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shiftY.value }, { scale: scale.value }],
  }));

  /** Paint for one muscle group given the current mode/state. */
  const paint = (key: MuscleGroup) => {
    const tier = effort[key];
    const isSelected = selected.includes(key);
    const isFocused = focus === key;
    const dim = focus && !isFocused ? 0.45 : 1;

    if (tier) {
      return { fill: alpha(tierColor[tier], 0.42), stroke: tierColor[tier], opacity: dim, sw: 1 };
    }
    if (isSelected) {
      return { fill: alpha(color.accent, 0.3), stroke: alpha(color.accent, 0.9), opacity: dim, sw: 1 };
    }
    return {
      fill: MUSCLE,
      stroke: isFocused ? alpha(color.accent, 0.8) : MUSCLE_EDGE,
      opacity: dim,
      sw: isFocused ? 1.4 : 1,
    };
  };

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={[{ width, height }, zoomStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${BOX_W} ${BOX_H}`}>
          {/* ------------------------------------------------ silhouette --- */}
          <Circle cx={60} cy={17} r={11.5} fill={BODY} />
          <Rect x={54.5} y={27} width={11} height={9} rx={3.5} fill={BODY} />
          {/* torso with a V-taper into the hips */}
          <Path
            d="M42 38 C46 35.5 52 34 60 34 C68 34 74 35.5 78 38
               L80 72 C80 86 77 96 75 104 L75 118 C75 124 68 127 60 127
               C52 127 45 124 45 118 L45 104 C43 96 40 86 40 72 Z"
            fill={BODY}
          />
          {/* arms */}
          <Path d="M38 40 C31 43 26 49 25 57 L23 104 C23 110 26 114 29 114 C33 114 35 110 35 104 L37 58 Z" fill={BODY} />
          <Path d="M82 40 C89 43 94 49 95 57 L97 104 C97 110 94 114 91 114 C87 114 85 110 85 104 L83 58 Z" fill={BODY} />
          {/* legs */}
          <Path d="M46 127 L58 129 L57 186 C57 191 54 194 51 194 C47 194 45 191 45 186 Z" fill={BODY} />
          <Path d="M74 127 L62 129 L63 186 C63 191 66 194 69 194 C73 194 75 191 75 186 Z" fill={BODY} />
          <Path d="M46 196 C50 194 55 195 55 200 L54 234 C54 238 51 240 49 240 C46 240 44 238 44 234 Z" fill={BODY} />
          <Path d="M74 196 C70 194 65 195 65 200 L66 234 C66 238 69 240 71 240 C74 240 76 238 76 234 Z" fill={BODY} />

          {/* -------------------------------------------------- muscles --- */}
          {side === 'front' ? (
            <FrontMuscles paint={paint} />
          ) : (
            <BackMuscles paint={paint} />
          )}
        </Svg>

        {/* Invisible tap targets, aligned to the drawn anatomy. */}
        {regions.map((m) => {
          const centers = m.pair ? [m.x - m.pair, m.x + m.pair] : [m.x];
          return centers.map((cx, i) => {
            const w = (m.w / 100) * width;
            const h = (m.h / 100) * height;
            return (
              <Pressable
                key={`${m.key}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                accessibilityState={{
                  selected: !!effort[m.key] || selected.includes(m.key),
                  expanded: focus === m.key,
                }}
                onPress={() => onPick(m.key)}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  left: (cx / 100) * width - w / 2,
                  top: (m.y / 100) * height - h / 2,
                  width: w,
                  height: h,
                }}
              />
            );
          });
        })}
      </Animated.View>
    </View>
  );
}

type Paint = (key: MuscleGroup) => { fill: string; stroke: string; opacity: number; sw: number };

function FrontMuscles({ paint }: { paint: Paint }) {
  const sh = paint('shoulders');
  const ch = paint('chest');
  const bi = paint('biceps');
  const co = paint('core');
  const qu = paint('quads');

  return (
    <>
      {/* delts */}
      <Ellipse cx={40} cy={46} rx={9} ry={7} {...svgPaint(sh)} />
      <Ellipse cx={80} cy={46} rx={9} ry={7} {...svgPaint(sh)} />

      {/* pecs */}
      <Path
        d="M46 50 C51 47.5 57.5 48.5 58.5 52 L58.5 64 C58.5 68 52 70.5 47 68
           C43 66 41.8 58 43 53 Z"
        {...svgPaint(ch)}
      />
      <Path
        d="M74 50 C69 47.5 62.5 48.5 61.5 52 L61.5 64 C61.5 68 68 70.5 73 68
           C77 66 78.2 58 77 53 Z"
        {...svgPaint(ch)}
      />

      {/* biceps */}
      <Ellipse cx={28} cy={67} rx={6} ry={11} {...svgPaint(bi)} />
      <Ellipse cx={92} cy={67} rx={6} ry={11} {...svgPaint(bi)} />

      {/* abs + obliques */}
      <Path
        d="M50 73 C53 71.5 67 71.5 70 73 L71 100 C71 106 66 109 60 109
           C54 109 49 106 49 100 Z"
        {...svgPaint(co)}
      />
      <Line x1={60} y1={73} x2={60} y2={108} stroke={alpha(color.bg, 0.55)} strokeWidth={1} opacity={co.opacity} />
      <Line x1={50} y1={82} x2={70} y2={82} stroke={alpha(color.bg, 0.55)} strokeWidth={1} opacity={co.opacity} />
      <Line x1={49.5} y1={91} x2={70.5} y2={91} stroke={alpha(color.bg, 0.55)} strokeWidth={1} opacity={co.opacity} />

      {/* quads */}
      <Path
        d="M46 132 C51 129 56 131 56.5 137 L55.5 172 C55 179 51 183 48.5 182
           C45.5 181 44 172 44 164 L44.5 138 Z"
        {...svgPaint(qu)}
      />
      <Path
        d="M74 132 C69 129 64 131 63.5 137 L64.5 172 C65 179 69 183 71.5 182
           C74.5 181 76 172 76 164 L75.5 138 Z"
        {...svgPaint(qu)}
      />
    </>
  );
}

function BackMuscles({ paint }: { paint: Paint }) {
  const ba = paint('back');
  const tr = paint('triceps');
  const gl = paint('glutes');
  const ha = paint('hamstrings');
  const ca = paint('calves');

  return (
    <>
      {/* traps + lats, one kite */}
      <Path
        d="M49 41 L71 41 C76 43.5 79.5 50 79.5 58 C79.5 70 71 82 65.5 87.5
           L60 92 L54.5 87.5 C49 82 40.5 70 40.5 58 C40.5 50 44 43.5 49 41 Z"
        {...svgPaint(ba)}
      />
      <Line x1={60} y1={44} x2={60} y2={90} stroke={alpha(color.bg, 0.55)} strokeWidth={1} opacity={ba.opacity} />

      {/* triceps */}
      <Ellipse cx={28} cy={71} rx={6} ry={11} {...svgPaint(tr)} />
      <Ellipse cx={92} cy={71} rx={6} ry={11} {...svgPaint(tr)} />

      {/* glutes */}
      <Ellipse cx={51.5} cy={116} rx={9.5} ry={8.5} {...svgPaint(gl)} />
      <Ellipse cx={68.5} cy={116} rx={9.5} ry={8.5} {...svgPaint(gl)} />

      {/* hamstrings */}
      <Path
        d="M46 132 C51 129.5 55.5 131 56 137 L55.5 168 C55 175 51 179 48.5 178
           C45.5 177 44.5 169 44.5 162 L45 138 Z"
        {...svgPaint(ha)}
      />
      <Path
        d="M74 132 C69 129.5 64.5 131 64 137 L64.5 168 C65 175 69 179 71.5 178
           C74.5 177 75.5 169 75.5 162 L75 138 Z"
        {...svgPaint(ha)}
      />

      {/* calves */}
      <Ellipse cx={49.5} cy={207} rx={6.5} ry={13} {...svgPaint(ca)} />
      <Ellipse cx={70.5} cy={207} rx={6.5} ry={13} {...svgPaint(ca)} />
    </>
  );
}

function svgPaint(p: { fill: string; stroke: string; opacity: number; sw: number }) {
  return { fill: p.fill, stroke: p.stroke, strokeWidth: p.sw, opacity: p.opacity };
}

