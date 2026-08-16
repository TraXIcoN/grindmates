import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateGroupSheet } from '@/components/feed/CreateGroupSheet';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/hooks/useApp';
import { useTraining } from '@/hooks/useTraining';
import { DEMO, demoExport, demoWipe } from '@/lib/demo';
import { getRestDefault, setRestDefault } from '@/lib/prefs';
import { formatJoinCode, shareJoinCode } from '@/lib/share';
import { border, color, layout, radius, tierColor, toggleTint, type } from '@/lib/theme';
import { exportTraining, summarize, wipeTraining } from '@/lib/workout';

const REST_OPTIONS = [60, 90, 120, 180];

/**
 * Tailored to what Grindmates is — a daily check-in app that happens to hold
 * your training log. Profile, the crew you rep, training defaults, and your
 * data. No theme pickers, no toggles for their own sake.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, activeGroup, signOut } = useApp();
  const { history } = useTraining();

  const [rest, setRest] = useState(90);
  const [crewOpen, setCrewOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    void getRestDefault().then(setRest);
  }, []);

  const pickRest = (seconds: number) => {
    void Haptics.selectionAsync();
    setRest(seconds);
    setRestDefault(seconds);
  };

  const shareCode = useCallback(async () => {
    if (!activeGroup?.join_code) return;
    const result = await shareJoinCode(activeGroup.name, activeGroup.join_code);
    if (result === 'copied') {
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    }
  }, [activeGroup]);

  const exportData = useCallback(async () => {
    const payload = JSON.stringify(
      {
        version: 2,
        exported_at: new Date().toISOString(),
        training: exportTraining(),
        ...(DEMO ? { local: JSON.parse(demoExport()) } : {}),
      },
      null,
      2,
    );
    if (Platform.OS === 'web') {
      const doc = (globalThis as { document?: Document }).document;
      if (!doc) return;
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = `grindmates-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ message: payload }).catch(() => {});
  }, []);

  const wipe = useCallback(async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      setTimeout(() => setConfirmWipe(false), 4000);
      return;
    }
    await wipeTraining();
    if (DEMO) {
      await demoWipe();
      await signOut();
      router.replace('/(auth)/sign-in');
    }
    setConfirmWipe(false);
  }, [confirmWipe, signOut, router]);

  const leave = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  }, [signOut, router]);

  const totalSets = history.reduce((sum, s) => sum + summarize(s).sets, 0);

  return (
    <View style={styles.screen}>
      <AmbientGlow top={-160} left={-80} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Who you are */}
        <View style={[styles.card, styles.who]}>
          <Avatar username={profile?.username ?? 'you'} url={profile?.avatar_url ?? null} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.whoName}>{profile?.username ?? 'you'}</Text>
            <Text style={styles.whoMeta}>
              Day {profile?.streak_count ?? 0} streak · {history.length} session
              {history.length === 1 ? '' : 's'} · {totalSets} sets logged
            </Text>
          </View>
        </View>

        {/* Crew */}
        <Text style={styles.sectionLabel}>CREW</Text>
        <View style={styles.card}>
          {activeGroup ? (
            <>
              <View style={styles.crewRow}>
                <Text style={styles.crewName}>
                  {activeGroup.emblem} {activeGroup.name}
                </Text>
                <Text style={styles.crewCount}>
                  {activeGroup.member_count ?? 1} member{(activeGroup.member_count ?? 1) === 1 ? '' : 's'}
                </Text>
              </View>
              {activeGroup.join_code ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share crew code"
                  onPress={() => void shareCode()}
                  style={({ pressed }) => [styles.codeRow, pressed && { backgroundColor: color.surface }]}
                >
                  <Text style={styles.codeLabel}>CODE</Text>
                  <Text style={styles.codeValue}>{formatJoinCode(activeGroup.join_code)}</Text>
                  <Text style={styles.codeAction}>{shared ? 'Copied' : 'Share'}</Text>
                </Pressable>
              ) : null}
              <View style={styles.divider} />
            </>
          ) : null}
          <RowBtn label={activeGroup ? 'New or join crew' : 'Start or join a crew'} onPress={() => setCrewOpen(true)} />
        </View>

        {/* Training defaults */}
        <Text style={styles.sectionLabel}>TRAINING</Text>
        <View style={styles.card}>
          <Text style={styles.prefLabel}>DEFAULT REST</Text>
          <View style={styles.restRow}>
            {REST_OPTIONS.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: rest === s }}
                onPress={() => pickRest(s)}
                style={[styles.restChip, rest === s && styles.restChipOn]}
              >
                <Text style={[styles.restText, rest === s && { color: color.accent }]}>
                  {s < 120 ? `${s}s` : `${s / 60}m`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.prefHint}>
            What the rest bar counts down after every logged set.
          </Text>
        </View>

        {/* Data */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <RowBtn
            label={DEMO ? 'Export everything (JSON)' : 'Export training log (JSON)'}
            onPress={() => void exportData()}
          />
          <View style={styles.divider} />
          <RowBtn label="Sign out" onPress={() => void leave()} />
          <View style={styles.divider} />
          <RowBtn
            label={
              confirmWipe
                ? 'Tap again to delete'
                : DEMO
                  ? 'Delete everything on this device'
                  : 'Delete local training log'
            }
            danger
            onPress={() => void wipe()}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.aboutLine}>Grindmates 1.0</Text>
          <Text style={styles.aboutSub}>
            Small closed crews. One check-in a day. Your training log stays on your device;
            check-ins are what the crew sees.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <CreateGroupSheet open={crewOpen} onClose={() => setCrewOpen(false)} />
    </View>
  );
}

function RowBtn({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.rowBtn, pressed && { backgroundColor: color.surface }]}
    >
      <Text style={[styles.rowBtnText, danger && { color: tierColor[3] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: layout.gutter },
  title: {
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: color.text,
    marginBottom: 16,
  },

  card: {
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 1.76,
    color: color.muted,
  },

  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.34, color: color.text },
  whoMeta: { marginTop: 2, fontSize: 12, fontWeight: '600', color: color.muted },

  crewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crewName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, color: color.text },
  crewCount: { fontSize: 11.5, fontWeight: '600', color: color.muted },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: color.bg,
  },
  codeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: color.muted },
  codeValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  codeAction: { fontSize: 11.5, fontWeight: '700', color: color.accent },
  divider: { height: 1, backgroundColor: border.faint, marginVertical: 4 },

  prefLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: color.muted },
  restRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  restChip: {
    minWidth: 54,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restChipOn: toggleTint(color.accent),
  restText: { fontSize: 12.5, fontWeight: '700', color: color.textTertiary },
  prefHint: { marginTop: 10, fontSize: 11.5, fontWeight: '500', color: color.textFaint },

  rowBtn: { paddingVertical: 12, paddingHorizontal: 4, borderRadius: 10 },
  rowBtnText: { fontSize: 14, fontWeight: '700', color: color.textSecondary },

  aboutLine: { fontSize: 14, fontWeight: '800', color: color.text },
  aboutSub: { marginTop: 6, fontSize: 12.5, fontWeight: '500', lineHeight: 18, color: color.muted },
});
