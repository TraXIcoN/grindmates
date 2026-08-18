import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { useApp } from '@/hooks/useApp';
import { accentGlow, border, color, radius, type } from '@/lib/theme';

type Mode = 'in' | 'up';

/** Lightweight email/password, with anonymous sign-in as the zero-friction path. */
export default function SignIn() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInAnonymously } = useApp();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit =
    email.includes('@') && password.length >= 6 && (mode === 'in' || username.trim().length >= 2);

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const message = await fn();
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    router.replace('/(app)/camera');
  }

  async function submitSignUp() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: message, needsConfirmation } = await signUpWithEmail(
      email.trim(),
      password,
      username.trim(),
    );
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    if (needsConfirmation) {
      // The account exists but there's no session yet — navigating here would
      // bounce straight back through the auth guard.
      setNotice(`Check ${email.trim()} for a confirmation link, then sign in.`);
      setMode('in');
      return;
    }
    router.replace('/(app)/camera');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AmbientGlow />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.wordmark}>GRINDMATES</Text>
        <Text style={styles.title}>
          {mode === 'in' ? 'Back at it.' : 'Start the streak.'}
        </Text>
        <Text style={styles.sub}>
          Small closed groups. One snap a day. No algorithm, no infinite scroll.
        </Text>

        <View style={styles.form}>
          {mode === 'up' ? (
            <Field
              label="USERNAME"
              value={username}
              onChangeText={setUsername}
              placeholder="ryan_m"
              autoCapitalize="none"
            />
          ) : null}
          <Field
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit || busy}
          onPress={() => {
            if (mode === 'in') void run(() => signInWithEmail(email.trim(), password));
            else void submitSignUp();
          }}
          style={({ pressed }) => [
            styles.cta,
            (!canSubmit || busy) && styles.ctaOff,
            pressed && canSubmit && !busy && { backgroundColor: color.accentHi },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={color.onAccent} />
          ) : (
            <Text style={[styles.ctaLabel, (!canSubmit || busy) && { color: color.muted }]}>
              {mode === 'in' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => run(signInAnonymously)}
          disabled={busy}
          style={({ pressed }) => [styles.ghost, pressed && { backgroundColor: color.surfaceHi }]}
        >
          <Text style={styles.ghostLabel}>Continue without an account</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setMode((m) => (m === 'in' ? 'up' : 'in'));
            setError(null);
          }}
          hitSlop={10}
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {mode === 'in' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={color.textFaint}
        style={styles.input}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 20, gap: 0 },
  wordmark: {
    fontSize: type.eyebrow.fontSize,
    fontWeight: '700',
    letterSpacing: 3.4,
    color: color.accent,
  },
  title: {
    marginTop: 14,
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: color.text,
  },
  sub: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 22,
    color: color.textTertiary,
    maxWidth: 300,
  },
  form: { marginTop: 30, gap: 14 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: color.muted,
    marginBottom: 7,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    color: color.text,
    fontSize: 15,
    fontWeight: '500',
  },
  error: { marginTop: 14, fontSize: 13, fontWeight: '600', color: color.tier3 },
  notice: { marginTop: 14, fontSize: 13, fontWeight: '600', lineHeight: 19, color: color.accent },
  cta: {
    marginTop: 24,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  ctaOff: { backgroundColor: color.surface, shadowOpacity: 0, elevation: 0 },
  ctaLabel: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
  ghost: {
    marginTop: 10,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { fontSize: 14, fontWeight: '700', color: color.textTertiary },
  switch: { marginTop: 22, alignSelf: 'center' },
  switchText: { fontSize: 13, fontWeight: '600', color: color.muted },
});
