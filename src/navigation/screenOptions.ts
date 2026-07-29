import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import type { Theme } from '../design/theme';

/**
 * iOS 26 gives transparent headers a Liquid Glass background for free. Older
 * versions need an explicit blur, and the docs warn that combining
 * `headerBlurEffect` with `scrollEdgeEffects` on iOS 26 can double up — so this
 * is only set below 26.
 */
const legacyHeaderBlur =
  Platform.OS === 'ios' &&
  Number.parseInt(String(Platform.Version), 10) < 26
    ? ('systemChromeMaterial' as const)
    : undefined;

/**
 * The tab-level stacks. Native large titles that collapse on scroll — screens
 * using these must render their ScrollView as the first child and set
 * `contentInsetAdjustmentBehavior="automatic"`, or the title will not collapse.
 */
export function nativeStackOptions(
  theme: Theme,
): NativeStackNavigationOptions {
  return {
    contentStyle: { backgroundColor: theme.colors.background },
    headerBackButtonDisplayMode: 'minimal',
    headerBlurEffect: legacyHeaderBlur,
    headerLargeTitleEnabled: true,
    headerLargeTitleShadowVisible: false,
    headerLargeTitleStyle: { color: theme.colors.text },
    headerShadowVisible: false,
    headerTintColor: theme.colors.accent,
    headerTitleStyle: { color: theme.colors.text },
    headerTransparent: Platform.OS === 'ios',
  };
}

/** Every modal in Tracky is a full-height native form sheet. */
export function nativeSheetOptions(
  theme: Theme,
): NativeStackNavigationOptions {
  return {
    contentStyle: { backgroundColor: theme.colors.groupedBackground },
    headerBackVisible: false,
    headerShadowVisible: false,
    headerShown: true,
    headerTintColor: theme.colors.text,
    presentation: 'formSheet',
    scrollEdgeEffects: { top: 'soft' },
    sheetAllowedDetents: [1],
    sheetGrabberVisible: false,
  };
}
