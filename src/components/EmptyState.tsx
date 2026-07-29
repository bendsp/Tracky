import type { IconSvgElement } from '@hugeicons/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { Icon } from './Icon';

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: IconSvgElement;
  title: string;
  body?: string;
}) {
  const { theme } = useTracky();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon color={theme.colors.accent} icon={icon} size={25} />
      </View>
      <Text style={[typography.headline, { color: theme.colors.text }]}>{title}</Text>
      {body ? (
        <Text
          style={[
            typography.body,
            styles.body,
            { color: theme.colors.textSecondary },
          ]}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  body: { marginTop: spacing.xs, maxWidth: 280, textAlign: 'center' },
});
