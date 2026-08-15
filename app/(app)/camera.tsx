import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SwitchCamera, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/hooks/useApp';
import { accentGlow, alpha, border, color, radius, type } from '@/lib/theme';

/**
 * BeReal-style capture. One shutter, one flip, one dismiss — nothing else.
 * The shot goes straight into the draft; upload happens on post so the user
 * never waits on the network mid-flow.
 */
export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patchDraft } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const capture = useCallback(async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
      if (photo?.uri) {
        patchDraft({ photoUri: photo.uri });
        router.replace('/(app)/log');
        return;
      }
    } catch {
      // Fall through — the shutter re-arms rather than throwing at the user.
    }
    setBusy(false);
  }, [busy, patchDraft, router]);

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.gate, { paddingTop: insets.top + 80 }]}>
        <Text style={styles.gateTitle}>Camera access</Text>
        <Text style={styles.gateBody}>
          Vitals needs the camera to capture your post-workout proof. Nothing is uploaded until you
          post.
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          style={({ pressed }) => [styles.gateCta, pressed && { backgroundColor: color.accentHi }]}
        >
          <Text style={styles.gateCtaLabel}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginTop: 18 }}>
          <Text style={styles.gateSkip}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      <Pressable
        accessibilityLabel="Close camera"
        onPress={() => router.back()}
        hitSlop={14}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color={color.text} strokeWidth={2.2} />
      </Pressable>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 34 }]}>
        <View style={styles.controlSpacer} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          onPress={() => void capture()}
          disabled={busy}
          style={({ pressed }) => [styles.shutterRing, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <View style={[styles.shutterCore, busy && { opacity: 0.5 }]} />
        </Pressable>

        <Pressable
          accessibilityLabel="Flip camera"
          onPress={() => {
            void Haptics.selectionAsync();
            setFacing((f) => (f === 'back' ? 'front' : 'back'));
          }}
          hitSlop={12}
          style={styles.flip}
        >
          <SwitchCamera size={22} color={color.text} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },

  close: {
    position: 'absolute',
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: alpha(color.bg, 0.55),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 24,
    backgroundColor: alpha(color.bg, 0.5),
  },
  controlSpacer: { width: 44 },
  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  shutterCore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: color.accent,
  },
  flip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: alpha(color.surface, 0.7),
    alignItems: 'center',
    justifyContent: 'center',
  },

  gate: { paddingHorizontal: 20 },
  gateTitle: {
    fontSize: type.title.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: color.text,
  },
  gateBody: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 22,
    color: color.textTertiary,
    maxWidth: 320,
  },
  gateCta: {
    marginTop: 26,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...accentGlow,
  },
  gateCtaLabel: {
    fontSize: type.cta.fontSize,
    fontWeight: '800',
    letterSpacing: -0.23,
    color: color.onAccent,
  },
  gateSkip: {
    fontSize: 13.5,
    fontWeight: '700',
    color: color.muted,
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: border.bold,
  },
});
