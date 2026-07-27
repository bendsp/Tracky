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
  sm: 8,
  md: 16,
  lg: 16,
  xl: 16,
  pill: 999,
} as const;

export const type = {
  eyebrow: { fontSize: 12, fontWeight: '500' as const, letterSpacing: -0.15 },
  title: { fontSize: 24, fontWeight: '500' as const, letterSpacing: -0.15 },
  section: { fontSize: 24, fontWeight: '500' as const, letterSpacing: -0.15 },
  cardTitle: { fontSize: 14, fontWeight: '500' as const, letterSpacing: -0.15 },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  label: { fontSize: 13, fontWeight: '500' as const, letterSpacing: -0.15 },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: -0.15,
    lineHeight: 17,
  },
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
      background: dark ? '#0A0A0A' : '#FFFFFF',
      backgroundRaised: dark ? '#0A0A0A' : '#FAFAFA',
      sheetBackground: dark ? '#121212' : '#F2F2F7',
      surface: dark ? '#171717' : '#FAFAFA',
      surfaceMuted: dark ? '#262626' : '#F5F5F5',
      text: dark ? '#FAFAFA' : '#292929',
      textSecondary: dark ? '#A3A3A3' : '#5D5D5D',
      textTertiary: dark ? '#737373' : '#9E9E9E',
      border: dark ? '#262626' : '#E5E5E5',
      separator: dark ? '#262626' : '#E5E5E5',
      accent: dark ? '#FAFAFA' : '#292929',
      onAccent: dark ? '#0A0A0A' : '#FFFFFF',
      accentSoft: dark ? accent.softDark : accent.softLight,
      danger: dark ? '#FF6961' : '#D92D20',
      dangerSoft: dark ? '#351A1B' : '#FCECEB',
      glassFallback: dark ? 'rgba(23,23,23,0.96)' : 'rgba(250,250,250,0.96)',
      glassHighlight: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.72)',
      glassIcon: dark ? '#A3A3A3' : '#5D5D5D',
      scrim: dark ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.24)',
    },
  } as const;
}
