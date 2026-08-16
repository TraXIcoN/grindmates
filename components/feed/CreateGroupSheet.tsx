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
import { accentGlow, alpha, border, color, radius, type } from '@/lib/theme';

const EMBLEMS = ['🔥', '⚡', '🏔️', '🦍', '🌊', '💪'];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * The first thing a new account does. Name + emblem, one lime CTA — creating a
 * crew drops you straight into it as the active group, so the next tap can be
 * the first check-in.
 */
export function CreateGroupSheet({ open, onClose }: Props) {
  const { addGroup } = useApp();
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState(EMBLEMS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length >= 2 && !busy;

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
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} bottomPad={40}>
      <Text style={styles.title}>New crew</Text>
      <Text style={styles.sub}>4–12 people. One check-in a day, each.</Text>

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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canCreate}
        onPress={() => void create()}
        style={({ pressed }) => [
          styles.cta,
          !canCreate && styles.ctaOff,
          pressed && canCreate && { backgroundColor: color.accentHi },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={color.onAccent} />
        ) : (
          <Text style={[styles.ctaText, !canCreate && { color: color.muted }]}>Create crew</Text>
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
});
