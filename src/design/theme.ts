import type { ColorSchemeName } from 'react-native';

export type AppearanceMode = 'system' | 'light' | 'dark';

export const accent = {
  primary: '#292929',
  softLight: '#F5F5F5',
  softDark: '#262626',
} as const;

export const activityAccents = [
  { label: 'Blue', value: '#3578F6' },
  { label: 'Indigo', value: '#625BDB' },
  { label: 'Violet', value: '#8A5CC7' },
  { label: 'Teal', value: '#168C88' },
  { label: 'Green', value: '#3D8B5A' },
  { label: 'Amber', value: '#B97818' },
  { label: 'Coral', value: '#C85D4A' },
  { label: 'Graphite', value: '#62666D' },
] as const;

export const habitColors = [
  { label: 'Coral', value: '#FF6B5E' },
  { label: 'Orange', value: '#FF9F0A' },
  { label: 'Gold', value: '#E7B416' },
  { label: 'Lime', value: '#8CCF35' },
  { label: 'Green', value: '#30B566' },
  { label: 'Mint', value: '#35C8A3' },
  { label: 'Teal', value: '#2AA7A1' },
  { label: 'Blue', value: '#0A84FF' },
  { label: 'Indigo', value: '#5E5CE6' },
  { label: 'Violet', value: '#AF52DE' },
  { label: 'Pink', value: '#E85D9E' },
  { label: 'Neutral', value: '#000000' },
] as const;

export const neutralHabitColor = habitColors[11].value;
export const defaultHabitColor = neutralHabitColor;

export function normalizeHabitColor(
  color: `#${string}`,
): `#${string}` {
  return color.toUpperCase() === accent.primary.toUpperCase()
    ? neutralHabitColor
    : color;
}

export function resolveHabitColor(
  color: `#${string}`,
  dark: boolean,
): `#${string}` {
  const normalized = normalizeHabitColor(color);
  return normalized === neutralHabitColor
    ? dark
      ? '#FAFAFA'
      : '#292929'
    : normalized;
}

/**
 * Ink that stays legible on top of an arbitrary habit colour. Uses perceived
 * luminance, so mid-tones like Gold and Lime get dark ink while the rest get
 * light.
 */
export function contrastingInk(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.64 ? '#0A0A0A' : '#FFFFFF';
}

export function colorWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return hex;
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/**
 * Three values, three names. `sm` for swatches, small icon tiles and inline
 * chips; `md` for cards, grouped containers and rows; `pill` for circles and
 * capsules. Anything at `md` also gets `borderCurve: 'continuous'` so the
 * corners are Apple squircles rather than circular arcs.
 */
export const radius = {
  sm: 8,
  md: 16,
  pill: 999,
} as const;

/**
 * The iOS text styles at the default Dynamic Type size, in SF Pro (the system
 * font — Tracky loads no custom face). Tracking is Apple's per-size curve: it
 * runs negative through the reading sizes and turns positive at display sizes.
 *
 * These are the only font sizes in the app. Never set `fontSize`, `fontWeight`,
 * `lineHeight` or `letterSpacing` outside this file — pick the closest style.
 */
export const type = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.06,
    lineHeight: 13,
  },
} as const;

/**
 * Clearance for the native tab bar. Screens inside `(tabs)` add this to their
 * scroll content inset so the last row never sits under the glass.
 */
export const tabBarInset = 88;

export type Theme = ReturnType<typeof makeTheme>;

export function resolveColorScheme(
  mode: AppearanceMode,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return mode;
}

export function makeTheme(scheme: 'light' | 'dark') {
  const dark = scheme === 'dark';

  return {
    dark,
    scheme,
    colors: {
      // Two background contexts, mirroring UIKit. Plain screens use
      // `background` and put cards on `surface`; grouped screens (Settings,
      // every sheet) use `groupedBackground` and put cards on
      // `groupedSurface`. In light mode the card is darker than a plain
      // background and lighter than a grouped one — that inversion is why a
      // single surface token could never work in both places.
      background: dark ? '#0A0A0A' : '#FFFFFF',
      surface: dark ? '#1C1C1E' : '#F2F2F7',
      groupedBackground: dark ? '#0A0A0A' : '#F2F2F7',
      groupedSurface: dark ? '#1C1C1E' : '#FFFFFF',
      surfaceMuted: dark ? '#2C2C2E' : '#E5E5EA',
      text: dark ? '#FAFAFA' : '#292929',
      textSecondary: dark ? '#A3A3A3' : '#5D5D5D',
      textTertiary: dark ? '#737373' : '#9E9E9E',
      border: dark ? '#2C2C2E' : '#E3E3E8',
      separator: dark ? '#38383A' : '#D8D8DC',
      accent: dark ? '#FAFAFA' : '#292929',
      onAccent: dark ? '#0A0A0A' : '#FFFFFF',
      accentSoft: dark ? accent.softDark : accent.softLight,
      danger: dark ? '#FF6961' : '#D92D20',
      dangerSoft: dark ? '#351A1B' : '#FCECEB',
      glassFallback: dark ? 'rgba(28,28,30,0.96)' : 'rgba(255,255,255,0.96)',
      glassHighlight: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.72)',
      glassIcon: dark ? '#A3A3A3' : '#5D5D5D',
      scrim: dark ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.24)',
    },
  } as const;
}
