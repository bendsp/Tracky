import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';

export function ScreenHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const { theme } = useTracky();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: theme.colors.text }]}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

export function SectionTitle({
  children,
  meta,
}: PropsWithChildren<{ meta?: string }>) {
  const { theme } = useTracky();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[typography.groupTitle, { color: theme.colors.text }]}
      >
        {children}
      </Text>
      {meta ? (
        <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  section: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
  },
});
