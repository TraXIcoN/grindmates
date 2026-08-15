import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ImageIcon, Plus } from 'lucide-react-native';

import { Sheet } from '@/components/ui/Sheet';
import { ShutterIcon } from '@/components/ui/icons';
import { alpha, border, color, radius, type } from '@/lib/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onSkipPhoto: () => void;
}

/** "Snap today's workout" — camera, library, or log without a photo. */
export function ComposerSheet({ open, onClose, onCamera, onLibrary, onSkipPhoto }: Props) {
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={styles.title}>Snap today&apos;s workout</Text>
      <Text style={styles.sub}>Two minutes to capture, then tag what you hit.</Text>

      <View style={styles.rows}>
        <Row onPress={onCamera} icon={<ShutterIcon size={20} />} label="Take a photo" />
        <Row
          onPress={onLibrary}
          icon={<ImageIcon size={20} color={color.textTertiary} strokeWidth={1.8} />}
          label="Choose from library"
          labelColor={color.textSecondary}
        />
        <Row
          onPress={onSkipPhoto}
          icon={<Plus size={20} color={color.muted} strokeWidth={1.8} />}
          label="Log without a photo"
          labelColor={color.textTertiary}
          outlined
        />
      </View>
    </Sheet>
  );
}

function Row({
  onPress,
  icon,
  label,
  labelColor = color.text,
  outlined = false,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  outlined?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        outlined ? styles.rowOutlined : styles.rowFilled,
        pressed && { backgroundColor: outlined ? alpha(color.surface, 0.5) : color.surfaceHi },
      ]}
    >
      {icon}
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: type.sheetTitle.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: color.text,
  },
  sub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: color.muted,
    marginTop: 5,
  },
  rows: { flexDirection: 'column', gap: 10, marginTop: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  rowFilled: { backgroundColor: color.surface },
  rowOutlined: { borderWidth: 1, borderColor: border.bold },
  rowLabel: { fontSize: 14.5, fontWeight: '700' },
});
