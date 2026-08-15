import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { color } from '@/lib/theme';

/**
 * The lime bloom behind the top-left of the feed:
 *   radial-gradient(circle, rgba(132,204,22,.14), transparent 68%)
 *   340×340, offset top:-120 left:-60
 */
export function AmbientGlow({
  size = 340,
  top = -120,
  left = -60,
  tint = color.accent,
  opacity = 0.14,
}: {
  size?: number;
  top?: number;
  left?: number;
  tint?: string;
  opacity?: number;
}) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top, left, width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={tint} stopOpacity={opacity} />
            <Stop offset="68%" stopColor={tint} stopOpacity={0} />
            <Stop offset="100%" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow)" />
      </Svg>
    </View>
  );
}
