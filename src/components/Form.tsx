import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { radius, spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const { theme } = useTracky();

  return (
    <View style={styles.field}>
      <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={theme.colors.textTertiary}
        selectionColor={theme.colors.accent}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
        ]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTracky();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: disabled
            ? theme.colors.surfaceMuted
            : theme.colors.accent,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        style={[
          typography.label,
          { color: disabled ? theme.colors.textTertiary : theme.colors.onAccent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const { theme } = useTracky();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.accentSoft
            : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.accent : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          typography.label,
          { color: selected ? theme.colors.accent : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primary: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
