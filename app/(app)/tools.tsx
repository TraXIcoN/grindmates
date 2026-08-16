import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { oneRepMax, plateMath, warmupRamp } from '@/lib/stats';
import { alpha, border, color, layout, radius, toggleTint, type } from '@/lib/theme';

type Tool = '1rm' | 'plates' | 'warmup';

const TOOLS: Array<[Tool, string]> = [
  ['1rm', '1RM'],
  ['plates', 'Plates'],
  ['warmup', 'Warm-up'],
];

/**
 * Gym-floor math, reachable from the rest timer — rest is exactly when you
 * work out the next load. Three calculators, all steppers, no keyboards.
 */
export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tool, setTool] = useState<Tool>('1rm');
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(5);
  const [target, setTarget] = useState(100);
  const [working, setWorking] = useState(80);
  const [bar, setBar] = useState<15 | 20>(20);

  const rm = useMemo(() => oneRepMax(weight, reps), [weight, reps]);
  const plates = useMemo(() => plateMath(target, bar), [target, bar]);
  const ramp = useMemo(() => warmupRamp(working, bar), [working, bar]);

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
        <Text style={styles.barTitle}>Tools</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.toolRow}>
          {TOOLS.map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: tool === key }}
              onPress={() => {
                void Haptics.selectionAsync();
                setTool(key);
              }}
              style={[styles.toolBtn, tool === key && styles.toolBtnOn]}
            >
              <Text style={[styles.toolLabel, tool === key && { color: color.accent }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tool === '1rm' ? (
          <View style={styles.card}>
            <StepperRow label="WEIGHT" value={`${weight} kg`} onStep={(d) => setWeight((v) => clamp(v + d * 2.5, 20, 400))} />
            <StepperRow label="REPS" value={String(reps)} onStep={(d) => setReps((v) => clamp(v + d, 1, 15))} />

            <View style={styles.result}>
              <Text style={styles.resultValue}>{rm.toFixed(1)}</Text>
              <Text style={styles.resultUnit}>kg · estimated 1RM (Epley)</Text>
            </View>

            <View style={styles.pctRows}>
              {[90, 80, 70].map((p) => (
                <View key={p} style={styles.pctRow}>
                  <Text style={styles.pctLabel}>{p}%</Text>
                  <Text style={styles.pctValue}>{(Math.round(((rm * p) / 100) / 2.5) * 2.5).toFixed(1)} kg</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {tool === 'plates' ? (
          <View style={styles.card}>
            <StepperRow label="TARGET" value={`${target} kg`} onStep={(d) => setTarget((v) => clamp(v + d * 2.5, 20, 400))} />
            <BarRow bar={bar} onBar={setBar} />

            <View style={styles.result}>
              {plates.plates.length === 0 ? (
                <Text style={styles.resultUnit}>Just the bar.</Text>
              ) : (
                <View style={styles.plateRow}>
                  {plates.plates.map((p, i) => (
                    <View key={`${p}-${i}`} style={styles.plate}>
                      <Text style={styles.plateText}>{p % 1 === 0 ? p : p.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.resultMeta}>
                Per side · loads to {plates.achieved.toFixed(1)} kg
                {plates.remainder > 0 ? ` (${plates.remainder.toFixed(1)} kg short of target)` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {tool === 'warmup' ? (
          <View style={styles.card}>
            <StepperRow label="WORKING WEIGHT" value={`${working} kg`} onStep={(d) => setWorking((v) => clamp(v + d * 2.5, 20, 400))} />
            <BarRow bar={bar} onBar={setBar} />

            <View style={styles.rampRows}>
              {ramp.map((set, i) => (
                <View key={i} style={styles.rampRow}>
                  <Text style={styles.rampLabel}>{set.label}</Text>
                  <Text style={styles.rampWeight}>{set.weightKg.toFixed(1)} kg</Text>
                  <Text style={styles.rampReps}>× {set.reps}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v * 100) / 100));
}

function StepperRow({
  label,
  value,
  onStep,
}: {
  label: string;
  value: string;
  onStep: (dir: 1 | -1) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <StepBtn icon="minus" onPress={() => { void Haptics.selectionAsync(); onStep(-1); }} />
        <Text style={styles.stepperValue}>{value}</Text>
        <StepBtn icon="plus" onPress={() => { void Haptics.selectionAsync(); onStep(1); }} />
      </View>
    </View>
  );
}

function BarRow({ bar, onBar }: { bar: 15 | 20; onBar: (b: 15 | 20) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>BAR</Text>
      <View style={styles.barChips}>
        {([15, 20] as const).map((b) => (
          <Pressable
            key={b}
            accessibilityRole="button"
            accessibilityState={{ selected: bar === b }}
            onPress={() => {
              void Haptics.selectionAsync();
              onBar(b);
            }}
            style={[
              styles.barChip,
              bar === b
                ? { backgroundColor: alpha(color.accent, 0.15), borderColor: alpha(color.accent, 0.4) }
                : { backgroundColor: color.surface, borderColor: 'transparent' },
            ]}
          >
            <Text style={[styles.barChipText, bar === b && { color: color.accent }]}>{b} kg</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepBtn({ icon, onPress }: { icon: 'minus' | 'plus'; onPress: () => void }) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'Less' : 'More'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <Icon size={14} color={color.textTertiary} strokeWidth={2.4} />
    </Pressable>
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
  barTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14, color: color.textTertiary },

  body: { paddingHorizontal: layout.gutter, paddingTop: 6, paddingBottom: 40 },

  toolRow: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnOn: toggleTint(color.accent),
  toolLabel: { fontSize: 13, fontWeight: '700', color: color.textTertiary },

  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.bgRaised,
    borderWidth: 1,
    borderColor: border.faint,
  },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stepperLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: color.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 74,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },

  barChips: { flexDirection: 'row', gap: 8 },
  barChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barChipText: { fontSize: 12.5, fontWeight: '700', color: color.textTertiary },

  result: {
    marginTop: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: border.faint,
    alignItems: 'center',
  },
  resultValue: {
    fontSize: type.display.fontSize,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: color.accent,
    fontVariant: ['tabular-nums'],
  },
  resultUnit: { marginTop: 4, fontSize: 12, fontWeight: '600', color: color.muted },
  resultMeta: { marginTop: 10, fontSize: 12, fontWeight: '600', color: color.muted, textAlign: 'center' },

  pctRows: { marginTop: 16, gap: 8 },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pctLabel: { fontSize: 12.5, fontWeight: '700', color: color.textTertiary },
  pctValue: { fontSize: 12.5, fontWeight: '800', color: color.textSecondary, fontVariant: ['tabular-nums'] },

  plateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  plate: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 8,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: alpha(color.accent, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateText: { fontSize: 13, fontWeight: '800', color: color.text, fontVariant: ['tabular-nums'] },

  rampRows: { marginTop: 14, paddingTop: 6, borderTopWidth: 1, borderTopColor: border.faint },
  rampRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  rampLabel: { width: 56, fontSize: 12, fontWeight: '700', color: color.textTertiary },
  rampWeight: { flex: 1, fontSize: 14.5, fontWeight: '800', color: color.text, fontVariant: ['tabular-nums'] },
  rampReps: { fontSize: 12.5, fontWeight: '700', color: color.muted },
});
