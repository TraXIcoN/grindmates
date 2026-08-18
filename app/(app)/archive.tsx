import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import Animated, {
  FadeIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useApp } from '@/hooks/useApp';
import { fetchArchive, type ArchiveItem } from '@/lib/api';
import { alpha, border, color, layout, radius, type } from '@/lib/theme';
import { timeAgo } from '@/lib/time';

/** Tile heights cycle through this pattern — rhythm without randomness. */
const HEIGHTS = [176, 220, 192, 236];
/** The right column drifts against the scroll — the wall's signature move. */
const DRIFT = 0.05;

interface MonthSection {
  label: string;
  left: Array<{ item: ArchiveItem; h: number }>;
  right: Array<{ item: ArchiveItem; h: number }>;
}

/**
 * The Vault — every photo the crew has ever posted. Not a grid: a two-column
 * wall where the right column scrolls a beat slower than the left, so the
 * page moves like a contact sheet sliding over itself. Months divide the
 * wall; a tap opens the shot full-bleed with who and when. Nothing bounces,
 * nothing spins — the drift is the only trick, and it's a quiet one.
 */
export default function ArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { activeGroup } = useApp();

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [picked, setPicked] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    if (!activeGroup) return;
    let alive = true;
    void fetchArchive(activeGroup.id)
      .then((rows) => alive && setItems(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeGroup]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * DRIFT }],
  }));

  /** Month sections, each balanced greedily into two columns. */
  const sections = useMemo<MonthSection[]>(() => {
    const byMonth = new Map<string, ArchiveItem[]>();
    for (const item of items) {
      const d = new Date(item.created_at);
      const key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
      byMonth.set(key, [...(byMonth.get(key) ?? []), item]);
    }
    let i = 0;
    return [...byMonth.entries()].map(([label, monthItems]) => {
      const left: MonthSection['left'] = [];
      const right: MonthSection['right'] = [];
      let lh = 0;
      let rh = 0;
      for (const item of monthItems) {
        const h = HEIGHTS[i % HEIGHTS.length];
        i += 1;
        if (lh <= rh) {
          left.push({ item, h });
          lh += h;
        } else {
          right.push({ item, h });
          rh += h;
        }
      }
      return { label, left, right };
    });
  }, [items]);

  const colWidth = (width - layout.gutter * 2 - 10) / 2;

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <ChevronLeft size={20} color={color.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.barTitle}>{activeGroup?.name ?? 'Crew'}</Text>
          <Text style={styles.barMeta}>
            VAULT · {items.length} PHOTO{items.length === 1 ? '' : 'S'}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing in the vault yet.</Text>
          <Text style={styles.emptyBody}>
            Every photo the crew posts lands here, for good. Check in with one and start the wall.
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.wall}
        >
          {sections.map((section) => (
            <View key={section.label}>
              <View style={styles.monthRow}>
                <Text style={styles.monthLabel}>{section.label}</Text>
                <View style={styles.monthRule} />
              </View>

              <View style={styles.columns}>
                <View style={[styles.column, { width: colWidth }]}>
                  {section.left.map(({ item, h }, i) => (
                    <Tile key={item.id} item={item} h={h} delay={i * 30} onPress={() => setPicked(item)} />
                  ))}
                </View>
                <Animated.View style={[styles.column, { width: colWidth }, driftStyle]}>
                  {section.right.map(({ item, h }, i) => (
                    <Tile key={item.id} item={item} h={h} delay={i * 30 + 15} onPress={() => setPicked(item)} />
                  ))}
                </Animated.View>
              </View>
            </View>
          ))}
          <View style={{ height: 80 }} />
        </Animated.ScrollView>
      )}

      {/* Full-bleed viewer. */}
      {picked ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.viewer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicked(null)} accessibilityLabel="Close photo" />
          <Image source={{ uri: picked.photo_url }} style={styles.viewerImg} contentFit="contain" transition={140} />
          <View style={[styles.viewerMeta, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.viewerName}>{picked.username}</Text>
            <Text style={styles.viewerTime}>{timeAgo(picked.created_at)}</Text>
            {picked.caption ? (
              <Text style={styles.viewerCaption} numberOfLines={3}>
                {picked.caption}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Close"
            onPress={() => setPicked(null)}
            hitSlop={14}
            style={[styles.viewerClose, { top: insets.top + 12 }]}
          >
            <X size={20} color={color.text} strokeWidth={2.2} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Tile({
  item,
  h,
  delay,
  onPress,
}: {
  item: ArchiveItem;
  h: number;
  delay: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(220).delay(delay)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Photo by ${item.username}, ${timeAgo(item.created_at)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.tile, { height: h }, pressed && { opacity: 0.85 }]}
      >
        <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 10,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.14, color: color.text },
  barMeta: { marginTop: 1, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: color.muted },

  wall: { paddingHorizontal: layout.gutter, paddingTop: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 12 },
  monthLabel: {
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },
  monthRule: { flex: 1, height: 1, backgroundColor: border.faint },

  columns: { flexDirection: 'row', gap: 10 },
  column: { gap: 10 },
  tile: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: color.photoBg,
    borderWidth: 1,
    borderColor: border.faint,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.34, color: color.text },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: color.muted,
    maxWidth: 280,
  },

  viewer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(color.scrim, 0.94),
    justifyContent: 'center',
    zIndex: 30,
  },
  viewerImg: { width: '100%', height: '68%' },
  viewerMeta: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  viewerName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, color: color.text },
  viewerTime: { marginTop: 2, fontSize: 11.5, fontWeight: '600', color: color.muted },
  viewerCaption: { marginTop: 8, fontSize: 13.5, fontWeight: '500', lineHeight: 20, color: color.textSecondary },
  viewerClose: {
    position: 'absolute',
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: alpha(color.bg, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
