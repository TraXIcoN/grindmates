import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ChevronDownIcon } from '@/components/ui/icons';
import { border, color, emblemGradients, menuShadow, radius, type } from '@/lib/theme';
import type { Group } from '@/lib/types';

/** Emblem gradients, cycled by group index — the three from the design. */
export function emblemGradient(index: number): [string, string] {
  return emblemGradients[index % emblemGradients.length];
}

export function Emblem({ glyph, index, size = 24 }: { glyph: string; index: number; size?: number }) {
  const [from, to] = emblemGradient(index);
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.emblem, { width: size, height: size, borderRadius: size / 3 }]}
    >
      <Text style={[styles.emblemGlyph, { fontSize: size * 0.458 }]}>{glyph.slice(0, 1)}</Text>
    </LinearGradient>
  );
}

interface Props {
  groups: Group[];
  active: Group | null;
  onSelect: (group: Group) => void;
}

/**
 * A pill, not a title — it reads as tappable. Opens a floating menu anchored
 * under the bar (top 110, left 20, width 236).
 */
export function GroupSwitcher({ groups, active, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const activeIndex = Math.max(0, groups.findIndex((g) => g.id === active?.id));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          void Haptics.selectionAsync();
          setOpen((v) => !v);
        }}
        style={({ pressed }) => [styles.pill, pressed && { backgroundColor: color.surfaceHi }]}
      >
        <Emblem glyph={active?.emblem ?? 'V'} index={activeIndex} />
        <Text style={styles.name} numberOfLines={1}>
          {active?.name ?? 'No group yet'}
        </Text>
        <ChevronDownIcon />
      </Pressable>

      {open ? (
        <>
          {/* Full-screen catcher so a tap anywhere dismisses the menu. */}
          <Pressable style={styles.catcher} onPress={() => setOpen(false)} />
          <Animated.View
            entering={FadeIn.duration(120)}
            exiting={FadeOut.duration(100)}
            style={styles.menu}
          >
            {groups.map((group, i) => (
              <Pressable
                key={group.id}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onSelect(group);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: color.surface },
                ]}
              >
                <Emblem glyph={group.emblem} index={i} />
                <Text style={styles.rowName} numberOfLines={1}>
                  {group.name}
                </Text>
                <Text style={styles.rowCount}>{group.member_count ?? '—'}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: border.soft,
    maxWidth: 240,
  },
  name: {
    fontSize: type.name.fontSize,
    fontWeight: '700',
    letterSpacing: -0.14,
    color: color.text,
    flexShrink: 1,
  },
  emblem: { alignItems: 'center', justifyContent: 'center' },
  emblemGlyph: { fontWeight: '900', color: color.onAccent },

  catcher: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 19,
  },
  menu: {
    position: 'absolute',
    top: 110,
    left: 20,
    width: 236,
    zIndex: 20,
    backgroundColor: color.elevated,
    borderWidth: 1,
    borderColor: border.strong,
    borderRadius: radius.menu,
    padding: 6,
    ...menuShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  rowName: { fontSize: 13.5, fontWeight: '600', color: color.text, flex: 1 },
  rowCount: { fontSize: 11, fontWeight: '600', color: color.muted },
});
