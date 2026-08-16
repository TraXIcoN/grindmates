import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { useApp } from '@/hooks/useApp';
import { formatJoinCode, shareJoinCode } from '@/lib/share';
import { accentGlow, alpha, border, color, radius, toggleTint, type } from '@/lib/theme';
import type { Group } from '@/lib/types';

const EMBLEMS = ['🔥', '⚡', '🏔️', '🦍', '🌊', '💪'];

type Mode = 'create' | 'join';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * One sheet, both doors into a crew: start a new one, or join with the
 * 8-digit code a friend shared. Creating ends on the code screen — the moment
 * a crew exists is exactly the moment you invite people to it.
 */
export function CreateGroupSheet({ open, onClose }: Props) {
  const { addGroup, joinGroup } = useApp();

  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState(EMBLEMS[0]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Group | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');

  const canCreate = name.trim().length >= 2 && !busy;
  const canJoin = code.replace(/\D/g, '').length === 8 && !busy;

  function close() {
    setError(null);
    setCreated(null);
    setShareState('idle');
    setCode('');
    onClose();
  }

  async function create() {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    const group = await addGroup(name.trim(), emblem);
    setBusy(false);
    if (!group) {
      setError('Could not create the crew. Try again.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName('');
    // Don't close — surface the code while the intent to invite is hot.
    setCreated(group);
  }

  async function join() {
    if (!canJoin) return;
    setBusy(true);
    setError(null);
    const { group, error: message } = await joinGroup(code);
    setBusy(false);
    if (!group) {
      setError(message ?? 'Could not join that crew.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close();
  }

  async function share() {
    if (!created?.join_code) return;
    const result = await shareJoinCode(created.name, created.join_code);
    if (result === 'copied') setShareState('copied');
    else if (result === 'shared') setShareState('shared');
  }

  /* ------------------------------------------------ created: show the code -- */
  if (created) {
    return (
      <Sheet open={open} onClose={close} bottomPad={40}>
        <Text style={styles.title}>{created.name} is live</Text>
        <Text style={styles.sub}>Share this code — it&apos;s how your people get in.</Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{formatJoinCode(created.join_code ?? '')}</Text>
          <Text style={styles.codeLabel}>CREW CODE</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void share()}
          style={({ pressed }) => [styles.cta, pressed && { backgroundColor: color.accentHi }]}
        >
          <Text style={styles.ctaText}>
            {shareState === 'copied' ? 'Copied' : shareState === 'shared' ? 'Shared' : 'Share code'}
          </Text>
        </Pressable>

        <Pressable onPress={close} style={styles.ghost} accessibilityRole="button">
          <Text style={styles.ghostText}>Done</Text>
        </Pressable>
      </Sheet>
    );
  }

  /* --------------------------------------------------------- create / join -- */
  return (
    <Sheet open={open} onClose={close} bottomPad={40}>
      <View style={styles.modeRow}>
        {(
          [
            ['create', 'Start a crew'],
            ['join', 'Join with code'],
          ] as Array<[Mode, string]>
        ).map(([m, label]) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            onPress={() => {
              void Haptics.selectionAsync();
              setMode(m);
              setError(null);
            }}
            style={[styles.modeBtn, mode === m && styles.modeBtnOn]}
          >
            <Text style={[styles.modeLabel, mode === m && { color: color.accent }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'create' ? (
        <>
          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="6AM Crew"
            placeholderTextColor={color.textFaint}
            style={styles.input}
            maxLength={24}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void create()}
          />

          <Text style={styles.fieldLabel}>EMBLEM</Text>
          <View style={styles.emblems}>
            {EMBLEMS.map((e) => {
              const on = emblem === e;
              return (
                <Pressable
                  key={e}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setEmblem(e);
                  }}
                  style={[
                    styles.emblemBtn,
                    on
                      ? { backgroundColor: alpha(color.accent, 0.13), borderColor: alpha(color.accent, 0.45) }
                      : { backgroundColor: color.surface, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={styles.emblemGlyph}>{e}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>CREW CODE</Text>
          <TextInput
            value={code}
            onChangeText={(next) => setCode(next.replace(/[^\d\s]/g, '').slice(0, 9))}
            placeholder="1234 5678"
            placeholderTextColor={color.textFaint}
            style={[styles.input, styles.codeInput]}
            keyboardType="number-pad"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void join()}
          />
          <Text style={styles.hint}>Ask anyone in the crew — it&apos;s on their switcher menu.</Text>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={mode === 'create' ? !canCreate : !canJoin}
        onPress={() => void (mode === 'create' ? create() : join())}
        style={({ pressed }) => {
          const enabled = mode === 'create' ? canCreate : canJoin;
          return [
            styles.cta,
            !enabled && styles.ctaOff,
            pressed && enabled && { backgroundColor: color.accentHi },
          ];
        }}
      >
        {busy ? (
          <ActivityIndicator color={color.onAccent} />
        ) : (
          <Text
            style={[
              styles.ctaText,
              (mode === 'create' ? !canCreate : !canJoin) && { color: color.muted },
            ]}
          >
            {mode === 'create' ? 'Create crew' : 'Join crew'}
          </Text>
        )}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: type.sheetTitle.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: color.text,
  },
  sub: { fontSize: 13.5, color: color.muted, marginTop: 5 },

  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnOn: toggleTint(color.accent),
  modeLabel: { fontSize: 13, fontWeight: '700', color: color.textTertiary },

  fieldLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: color.muted,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.text,
    fontSize: 15,
    fontWeight: '500',
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: { marginTop: 10, fontSize: 12, fontWeight: '500', color: color.textFaint },

  emblems: { flexDirection: 'row', gap: 8 },
  emblemBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemGlyph: { fontSize: 22 },

  error: { marginTop: 14, fontSize: 13, fontWeight: '600', color: color.tier3 },

  codeBox: {
    marginTop: 22,
    paddingVertical: 22,
    borderRadius: radius.card,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: border.subtle,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  codeLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: color.muted,
  },

  cta: {
    marginTop: 24,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ctaOff: { backgroundColor: color.surface, shadowOpacity: 0, elevation: 0 },
  ctaText: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
  ghost: {
    marginTop: 10,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 14, fontWeight: '700', color: color.textTertiary },
});
