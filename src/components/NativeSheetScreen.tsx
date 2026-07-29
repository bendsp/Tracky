import type { PropsWithChildren } from 'react';
import type {
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';

export function NativeSheetScreen({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>) {
  const { theme } = useTracky();

  return (
    <View
      collapsable={false}
      style={[
        styles.screen,
        { backgroundColor: theme.colors.groupedBackground },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function NativeSheetScrollView({
  automaticallyAdjustKeyboardInsets = false,
  children,
  contentContainerStyle,
  style,
  ...props
}: PropsWithChildren<ScrollViewProps>) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.scrollContainer}
      keyboardDismissMode={
        automaticallyAdjustKeyboardInsets ? 'interactive' : undefined
      }
      keyboardShouldPersistTaps={
        automaticallyAdjustKeyboardInsets ? 'handled' : undefined
      }
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, style]}
      {...props}
    >
      <View
        style={[
          styles.scrollBody,
          {
            paddingBottom: Math.max(
              spacing.xxxl,
              insets.bottom + spacing.md,
            ),
            paddingTop: insets.top,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContainer: {
    alignItems: 'stretch',
    flexGrow: 1,
  },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
});
