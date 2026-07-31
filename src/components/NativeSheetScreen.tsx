import type { PropsWithChildren } from 'react';
import type {
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

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
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      // A form sheet's own safe-area top inset is 0, so "never" left content
      // running underneath the sheet's navigation bar. Let iOS inset it below
      // the bar — and above the home indicator — instead.
      contentInsetAdjustmentBehavior="automatic"
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
      <View style={[styles.scrollBody, contentContainerStyle]}>
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
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
});
