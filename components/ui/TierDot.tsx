import React from 'react';
import { View } from 'react-native';

import { tierColor } from '@/lib/theme';
import type { EffortLevel } from '@/lib/types';

/**
 * Effort tier marker. 7px with a glow of its own colour, so "what" and
 * "how hard" read in one glance (per the MUSCLE STRIP note in the design).
 */
export function TierDot({ tier, size = 7 }: { tier: EffortLevel; size?: number }) {
  const tint = tierColor[tier];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint,
        shadowColor: tint,
        shadowOpacity: 1,
        shadowRadius: size * 1.15,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
      }}
    />
  );
}
