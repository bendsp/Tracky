import type { NativeStackNavigationOptions } from 'expo-router';

import type { Theme } from '../design/theme';

export function nativeSheetOptions(
  theme: Theme,
): NativeStackNavigationOptions {
  return {
    contentStyle: { backgroundColor: theme.colors.sheetBackground },
    headerBackVisible: false,
    headerShadowVisible: false,
    headerShown: true,
    headerTintColor: theme.colors.text,
    headerTransparent: true,
    presentation: 'formSheet',
    scrollEdgeEffects: { top: 'soft' },
    sheetAllowedDetents: [1],
    sheetCornerRadius: 40,
    sheetGrabberVisible: false,
    sheetInitialDetentIndex: 0,
  };
}
