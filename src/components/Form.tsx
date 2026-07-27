import {
  Button,
  Host,
  Text as NativeText,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityLabel,
  autocorrectionDisabled,
  background,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  font,
  foregroundColor,
  frame,
  keyboardType as keyboardTypeModifier,
  lineLimit,
  onSubmit,
  padding,
  shapes,
  strokeBorder,
  submitLabel,
  textFieldStyle,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { radius, spacing } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { selectionHaptic, tapHaptic } from '../utils/haptics';

type FieldProps = {
  accessibilityLabel?: string;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'decimal-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onSubmitEditing?: (value: string) => void;
  placeholder?: string;
  returnKeyType?: 'done';
  value: string;
};

export function Field({
  accessibilityLabel: fieldAccessibilityLabel,
  autoCapitalize = 'sentences',
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType,
  value,
}: FieldProps) {
  const { theme } = useTracky();
  const nativeText = useNativeState(value);
  const latestNativeValue = useRef(value);
  const pendingNativeValues = useRef<string[]>([]);

  useEffect(() => {
    const acknowledgedIndex = pendingNativeValues.current.lastIndexOf(value);
    if (acknowledgedIndex >= 0) {
      pendingNativeValues.current.splice(0, acknowledgedIndex + 1);
      return;
    }
    pendingNativeValues.current = [];
    if (nativeText.get() !== value) {
      latestNativeValue.current = value;
      nativeText.set(value);
    }
  }, [nativeText, value]);

  const handleTextChange = (nextValue: string) => {
    latestNativeValue.current = nextValue;
    pendingNativeValues.current.push(nextValue);
    onChangeText(nextValue);
  };

  const handleSubmit = () => {
    setTimeout(() => onSubmitEditing?.(latestNativeValue.current), 0);
  };

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.fullWidth}
    >
      <VStack alignment="leading" spacing={0}>
        <NativeText
          modifiers={[
            font({ textStyle: 'caption', weight: 'semibold' }),
            foregroundColor(theme.colors.textSecondary),
            padding({ bottom: spacing.sm }),
          ]}
        >
          {label}
        </NativeText>
        <TextField
          axis={multiline ? 'vertical' : 'horizontal'}
          onTextChange={handleTextChange}
          placeholder={placeholder}
          text={nativeText}
          modifiers={[
            accessibilityLabel(fieldAccessibilityLabel ?? label),
            textFieldStyle('plain'),
            font({ textStyle: 'body' }),
            foregroundColor(theme.colors.text),
            tint(theme.colors.accent),
            textInputAutocapitalization(
              autoCapitalize === 'none' ? 'never' : 'sentences',
            ),
            autocorrectionDisabled(autoCapitalize === 'none'),
            ...(keyboardType
              ? [keyboardTypeModifier(keyboardType)]
              : []),
            ...(returnKeyType ? [submitLabel(returnKeyType)] : []),
            ...(onSubmitEditing ? [onSubmit(handleSubmit)] : []),
            ...(multiline ? [lineLimit({ min: 3, max: 6 })] : []),
            padding({
              horizontal: spacing.md,
              vertical: multiline ? spacing.md : spacing.sm,
            }),
            frame({ maxWidth: 1000, minHeight: multiline ? 92 : 52 }),
            background(
              theme.colors.surface,
              shapes.roundedRectangle({
                cornerRadius: radius.md,
                roundedCornerStyle: 'continuous',
              }),
            ),
            strokeBorder({
              color: theme.colors.border,
              cornerRadius: radius.md,
              shape: 'roundedRectangle',
              style: { lineWidth: 1 },
            }),
          ]}
        />
      </VStack>
    </Host>
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
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.fullWidth}
    >
      <Button
        label={label}
        onPress={() => {
          tapHaptic();
          onPress();
        }}
        modifiers={[
          accessibilityLabel(label),
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', radius.md),
          controlSize('large'),
          tint(theme.colors.accent),
          frame({ maxWidth: 1000, minHeight: 54 }),
          disabledModifier(disabled),
        ]}
      />
    </Host>
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
    <Host
      colorScheme={theme.scheme}
      matchContents
      seedColor={theme.colors.accent}
    >
      <Button
        label={label}
        onPress={() => {
          selectionHaptic();
          onPress();
        }}
        modifiers={[
          accessibilityLabel(label),
          buttonStyle(selected ? 'borderedProminent' : 'bordered'),
          buttonBorderShape('capsule'),
          controlSize('regular'),
          tint(theme.colors.accent),
          ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
});
