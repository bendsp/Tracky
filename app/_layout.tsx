import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { spacing, type as typography } from '../src/design/theme';
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
        <Text style={[typography.section, { color: theme.colors.text }]}>
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
          <Text style={[typography.label, { color: theme.colors.onAccent }]}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

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
          options={{
            contentStyle: { backgroundColor: theme.colors.background },
            headerBackVisible: false,
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            presentation: 'formSheet',
            sheetAllowedDetents: [1],
            sheetCornerRadius: 40,
            sheetGrabberVisible: false,
            sheetInitialDetentIndex: 0,
          }}
        />
        <Stack.Screen
          name="log-tracker"
          options={{
            contentStyle: { backgroundColor: theme.colors.background },
            headerBackVisible: false,
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            presentation: 'formSheet',
            sheetAllowedDetents: [1],
            sheetCornerRadius: 40,
            sheetGrabberVisible: false,
            sheetInitialDetentIndex: 0,
          }}
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
          <Text style={[typography.label, { color: theme.colors.danger }]}>
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
        <RevenueCatProvider>
          <RootNavigator />
        </RevenueCatProvider>
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
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  saveError: {
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 104,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
  },
});
