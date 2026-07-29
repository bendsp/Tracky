import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';

/**
 * The only section header in Tracky. Sits above a grouped card and never
 * inside one. Adds no horizontal padding of its own so it aligns to the leading
 * edge of the cards it labels — put it in the same container as them. Sentence
 * case, matching SwiftUI `Form` and modern Settings.app; uppercase headers are
 * the iOS 12 look.
 */
export function SectionHeader({
  children,
  meta,
}: PropsWithChildren<{ meta?: string }>) {
  const { theme } = useTracky();
  return (
    <View style={styles.header}>
      <Text
        accessibilityRole="header"
        style={[typography.footnote, { color: theme.colors.textSecondary }]}
      >
        {children}
      </Text>
      {meta ? (
        <Text
          style={[typography.footnote, { color: theme.colors.textTertiary }]}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    paddingTop: spacing.xl,
  },
});
