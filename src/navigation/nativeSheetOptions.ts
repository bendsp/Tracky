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
    headerStyle: { backgroundColor: theme.colors.sheetBackground },
    headerTintColor: theme.colors.text,
    presentation: 'formSheet',
    sheetAllowedDetents: [1],
    sheetCornerRadius: 40,
    sheetGrabberVisible: false,
    sheetInitialDetentIndex: 0,
  };
}
