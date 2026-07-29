import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  radius,
  spacing,
  tabBarInset,
  type as typography,
} from '../src/design/theme';
import { nativeSheetOptions } from '../src/navigation/screenOptions';
import { TrackerEditorSessionProvider } from '../src/store/TrackerEditorSession';
import { useTracky, TrackyProvider } from '../src/store/TrackyProvider';
import { RevenueCatProvider } from '../src/subscriptions/RevenueCatProvider';

function RootNavigator() {
  const {
    hydrated,
    loadError,
    retryHydration,
    retryPersistence,
    saveError,
    theme,
  } = useTracky();

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.loadError, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Text style={[typography.title2, { color: theme.colors.text }]}>
          Local data couldn’t be opened
        </Text>
        <Text
          style={[
            typography.body,
            styles.loadErrorBody,
            { color: theme.colors.textSecondary },
          ]}
        >
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retryHydration}
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Text style={[typography.headline, { color: theme.colors.onAccent }]}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  const formSheetOptions = nativeSheetOptions(theme);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="tracker-detail"
          options={formSheetOptions}
        />
        <Stack.Screen
          name="log-tracker"
          options={formSheetOptions}
        />
        <Stack.Screen
          name="tracker-editor"
          options={formSheetOptions}
        />
        <Stack.Screen
          name="tracker-icon-picker"
          options={formSheetOptions}
        />
        <Stack.Screen
          name="tracker-start-date"
          options={formSheetOptions}
        />
      </Stack>
      {saveError ? (
        <Pressable
          accessibilityLabel="Local save failed. Tap to retry."
          accessibilityRole="button"
          onPress={retryPersistence}
          style={[
            styles.saveError,
            {
              backgroundColor: theme.colors.dangerSoft,
              borderColor: theme.colors.danger,
            },
          ]}
        >
          <Text style={[typography.footnote, { color: theme.colors.danger }]}>
            Local save failed · Tap to retry
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TrackyProvider>
        <TrackerEditorSessionProvider>
          <RevenueCatProvider>
            <RootNavigator />
          </RevenueCatProvider>
        </TrackerEditorSessionProvider>
      </TrackyProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadError: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadErrorBody: {
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  saveError: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: tabBarInset + spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
  },
});
