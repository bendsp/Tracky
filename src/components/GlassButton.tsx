import type { IconSvgElement } from '@hugeicons/react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { Icon } from './Icon';

const glassAvailable = isGlassEffectAPIAvailable();

export function GlassButton({
  accessibilityLabel,
  disabled = false,
  icon,
  label,
  onPress,
  prominent = false,
  compact = false,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: IconSvgElement;
  label?: string;
  onPress: () => void;
  prominent?: boolean;
  compact?: boolean;
}) {
  const { theme } = useTracky();
  const content = (
    <View
      style={[
        styles.content,
        compact ? styles.compact : styles.regular,
        label ? styles.withLabel : null,
      ]}
    >
      {icon ? (
        <Icon
          color={
            disabled
              ? theme.colors.textTertiary
              : prominent
                ? theme.colors.onAccent
                : theme.colors.text
          }
          icon={icon}
          size={compact ? 19 : 22}
        />
      ) : null}
      {label ? (
        <Text
          style={[
            typography.headline,
            {
              color: disabled
                ? theme.colors.textTertiary
                : prominent
                  ? theme.colors.onAccent
                  : theme.colors.text,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      {glassAvailable ? (
        <GlassView
          glassEffectStyle="regular"
          isInteractive={!disabled}
          style={styles.glass}
          tintColor={prominent && !disabled ? theme.colors.accent : undefined}
        >
          {content}
        </GlassView>
      ) : (
        <View
          style={[
            styles.glass,
            {
              backgroundColor: prominent
                ? theme.colors.accent
                : theme.colors.glassFallback,
            },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: radius.pill },
  glass: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  regular: { minHeight: 54, minWidth: 54, paddingHorizontal: spacing.md },
  compact: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.sm },
  withLabel: { gap: spacing.xs },
});
