import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { color } from '@/lib/theme';

/**
 * Two icons are drawn by hand because the design uses custom paths that lucide
 * has no equivalent for: the two-tone streak flame and the high-five hand.
 * Everything else comes from lucide-react-native.
 */

/** Solid flame — the reaction icon. Takes the pill's current colour. */
export function FlameIcon({ size = 16, fill }: { size?: number; fill: string }) {
  return (
    <Svg width={size} height={(size * 17) / 16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5c.6 3.4-1.4 4.6-2.9 6C7.3 10.2 6 11.8 6 14.3 6 18 8.7 21 12 21s6-3 6-6.7c0-3.6-2.3-5-3.4-7.4-.4 1.4-1.2 2.2-2.2 2.9.5-2.3.3-5-.4-7.3z"
        fill={fill}
      />
    </Svg>
  );
}

/** Two-tone flame — the streak badge. Red body, amber inner core. */
export function StreakFlameIcon({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 17) / 15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5c.6 3.4-1.4 4.6-2.9 6C7.3 10.2 6 11.8 6 14.3 6 18 8.7 21 12 21s6-3 6-6.7c0-3.6-2.3-5-3.4-7.4-.4 1.4-1.2 2.2-2.2 2.9.5-2.3.3-5-.4-7.3z"
        fill={color.tier3}
      />
      <Path
        d="M12 21c-1.9 0-3.4-1.7-3.4-3.8 0-2 1.5-2.9 2.3-4.3.6 1.4 1.5 1.9 2.4 3 .7.8 1 1.6 1 2.5 0 1.5-1 2.6-2.3 2.6z"
        fill={color.tier2}
      />
    </Svg>
  );
}

/** High-five hand — stroked, takes the pill's current colour. */
export function HighFiveIcon({ size = 16, stroke }: { size?: number; stroke: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 11V5.2a1.6 1.6 0 013.2 0V10m0-1.2a1.6 1.6 0 013.2 0V11m0-1.2a1.6 1.6 0 013.2 0v5.4c0 3.2-2.2 5.6-5.4 5.6-2.4 0-4-1-5.2-2.8l-2.4-3.6a1.7 1.7 0 012.6-2.1L8 14"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Comment bubble — matches the design's rounded-corner speech path. */
export function CommentIcon({ size = 16, stroke }: { size?: number; stroke: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.4 3.6a.6.6 0 01-1-.5V16h-.1A2.5 2.5 0 014 13.5z"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Camera — the FAB glyph. */
export function CameraIcon({ size = 20, stroke }: { size?: number; stroke: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 8.6c0-1.1.9-2 2-2h1.9c.6 0 1.2-.3 1.6-.9l.7-1c.4-.5 1-.9 1.6-.9h2.4c.6 0 1.2.4 1.6.9l.7 1c.4.6 1 .9 1.6.9H19c1.1 0 2 .9 2 2v8.4c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2z"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12.8} r={3.4} stroke={stroke} strokeWidth={1.9} />
    </Svg>
  );
}

/** Shutter — concentric rings on the composer's "Take a photo" row. */
export function ShutterIcon({ size = 20, tint = color.accent }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={tint} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={3.5} fill={tint} />
    </Svg>
  );
}

/** Kebab — the card's overflow affordance, 40% opacity. */
export function KebabIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={0.4}>
      <Circle cx={12} cy={5} r={1.7} fill={color.text} />
      <Circle cx={12} cy={12} r={1.7} fill={color.text} />
      <Circle cx={12} cy={19} r={1.7} fill={color.text} />
    </Svg>
  );
}

/** Chevron — group switcher disclosure, 55% opacity. */
export function ChevronDownIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={0.55}>
      <Path
        d="M4 6.5L8 10.5L12 6.5"
        stroke={color.text}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
