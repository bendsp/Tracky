import type { ColorSchemeName } from 'react-native';

export type AppearanceMode = 'system' | 'light' | 'dark';

export const accent = {
  primary: '#3578F6',
  softLight: '#EAF1FF',
  softDark: '#152342',
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

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const type = {
  eyebrow: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.9 },
  section: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.35 },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.15 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
} as const;

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
      background: dark ? '#09090B' : '#F6F6F3',
      backgroundRaised: dark ? '#101012' : '#FBFBF9',
      surface: dark ? '#19191C' : '#FFFFFF',
      surfaceMuted: dark ? '#222226' : '#ECECE8',
      text: dark ? '#F5F5F3' : '#171716',
      textSecondary: dark ? '#A2A2A8' : '#71716D',
      textTertiary: dark ? '#74747B' : '#9A9A94',
      border: dark ? '#2C2C31' : '#E1E1DB',
      separator: dark ? '#252529' : '#E9E9E4',
      accent: accent.primary,
      onAccent: '#FFFFFF',
      accentSoft: dark ? accent.softDark : accent.softLight,
      danger: dark ? '#FF6961' : '#D92D20',
      dangerSoft: dark ? '#351A1B' : '#FCECEB',
      glassFallback: dark ? 'rgba(27,27,31,0.96)' : 'rgba(246,246,243,0.96)',
      glassHighlight: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.72)',
      glassIcon: dark ? '#A8A8AF' : '#67676D',
      scrim: dark ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.24)',
    },
  } as const;
}
