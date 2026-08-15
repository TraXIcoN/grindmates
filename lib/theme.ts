/**
 * Design tokens — transcribed verbatim from
 * "Vitals - Design System & Feed.dc.html" (section: TOKENS).
 *
 * Single source of truth. Nothing in /components hardcodes a hex value.
 */

export const color = {
  /** App ground */
  bg: '#090D16',
  /** Bars, sheets, cards */
  bgRaised: '#0F172A',
  /** Cards, chips */
  surface: '#1E293B',
  /** Chip/pill hover + pressed */
  surfaceHi: '#243449',
  /** Floating menus (group switcher popover) */
  elevated: '#141C2D',
  /** Photo letterbox behind a check-in image */
  photoBg: '#0B1220',
  /** Sheet/modal scrim base — the design doc's page ground */
  scrim: '#05070D',

  /** One live action per screen */
  accent: '#84CC16',
  accentHi: '#A3E635',
  /** Text/icon riding on accent */
  onAccent: '#0B1220',

  /** Effort tiers: 1 Light (pump) · 2 Moderate (working) · 3 Heavy (to failure) */
  tier1: '#22C55E',
  tier2: '#F59E0B',
  tier3: '#EF4444',

  /** Inactive / ready */
  muted: '#64748B',

  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textFaint: '#475569',

  /** Streak count, the only warm thing above the fold */
  ember: '#FCA5A5',

  /** Avatar ring + grabber */
  slate600: '#475569',
  slate700: '#334155',
} as const;

/** Hairlines. The design uses slate-400 at varying alpha. */
export const border = {
  faint: 'rgba(148,163,184,0.12)',
  subtle: 'rgba(148,163,184,0.14)',
  soft: 'rgba(148,163,184,0.16)',
  strong: 'rgba(148,163,184,0.18)',
  bold: 'rgba(148,163,184,0.20)',
  dashed: 'rgba(148,163,184,0.22)',
} as const;

/** Spacing scale — 1·4 2·8 3·12 4·16 6·24 8·32 */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const radius = {
  chip: 12,
  card: 20,
  menu: 16,
  sheet: 26,
  pill: 999,
} as const;

/** Gutter 20. Card gap 16. Screen padding 20 horizontal, 12 above the first card. */
export const layout = {
  gutter: 20,
  cardGap: 16,
  firstCardTop: 12,
  /** Tap target never under 44. */
  minTouch: 44,
  /** Visual height of a reaction pill (hitSlop makes up the difference to 44). */
  pillHeight: 40,
  /** Check-in photo height at 402pt logical width (4:5-ish crop). */
  photoHeight: 342,
} as const;

const sans = 'Inter';
const mono = 'JetBrainsMono';

/**
 * Type scale. `family` is only applied when the fonts have loaded — see
 * useAppFonts(); RN falls back to the system face otherwise.
 */
export const type = {
  /** display / 44·900 — the rest timer countdown */
  display: { fontSize: 44, fontWeight: '900', letterSpacing: -1.76, lineHeight: 44 },
  /** title / 28·800 — screen questions */
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7, lineHeight: 31 },
  /** sheet titles */
  sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  /** body / 15·500 */
  body: { fontSize: 15, fontWeight: '500' },
  /** label / 12·700 tracked */
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.68 },
  /** section eyebrow / 11·700 tracked */
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.76 },
  /** meta / 12·500 */
  meta: { fontSize: 12, fontWeight: '500' },
  /** poster name */
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.14 },
  /** pill counts & tag labels */
  pill: { fontSize: 13, fontWeight: '700' },
  tag: { fontSize: 12, fontWeight: '700', letterSpacing: -0.12 },
  /** primary CTA */
  cta: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.23 },
} as const;

export const font = { sans, mono } as const;

/** Effort tier -> colour, in tier order. */
export const tierColor = {
  1: color.tier1,
  2: color.tier2,
  3: color.tier3,
} as const;

export const tierLabel = {
  1: 'Light',
  2: 'Moderate',
  3: 'Heavy',
} as const;

/** Copy used on the effort sheet — the brief's flavour names. */
export const tierFlavour = {
  1: 'Pump',
  2: 'Working',
  3: 'To failure',
} as const;

/** rgba() from a 6-digit hex + alpha. Keeps tinted states token-derived. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Emblem gradients for group badges, cycled by index. */
export const emblemGradients: Array<[string, string]> = [
  [color.accent, color.tier1],
  ['#38BDF8', '#6366F1'],
  [color.tier2, color.tier3],
];

/** The tinted state shared by every toggle: 15% fill, 33% border. */
export function toggleTint(tint: string) {
  return { backgroundColor: alpha(tint, 0.15), borderColor: alpha(tint, 0.33) };
}

/** The lime glow the FAB casts. */
export const accentGlow = {
  shadowColor: color.accent,
  shadowOpacity: 0.34,
  shadowRadius: 17,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
} as const;

export const menuShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.6,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 24 },
  elevation: 24,
} as const;
