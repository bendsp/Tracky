import DateTimePicker from '@expo/ui/community/datetime-picker';
import {
  Button,
  ColorPicker,
  Host,
  Menu,
  Picker,
  Text,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel as nativeAccessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useTracky } from '../store/TrackyProvider';

export function NativeSegmentedPicker<T extends string>({
  accessibilityLabel,
  onSelectionChange,
  options,
  selection,
}: {
  accessibilityLabel: string;
  onSelectionChange: (selection: T) => void;
  options: readonly { label: string; value: T }[];
  selection: T;
}) {
  const { theme } = useTracky();

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.fullWidth}
    >
      <Picker
        label={accessibilityLabel}
        modifiers={[pickerStyle('segmented')]}
        onSelectionChange={onSelectionChange}
        selection={selection}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

export function NativeMenuPicker<T extends string>({
  accessibilityLabel,
  compact = false,
  label,
  onSelectionChange,
  options,
  selection,
}: {
  accessibilityLabel: string;
  compact?: boolean;
  label: string;
  onSelectionChange: (selection: T) => void;
  options: readonly { label: string; value: T }[];
  selection: T;
}) {
  const { theme } = useTracky();

  if (compact) {
    return (
      <Host
        colorScheme={theme.scheme}
        matchContents={{ vertical: true }}
        seedColor={theme.colors.accent}
        style={[
          styles.compactMenu,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Menu
          label={label || accessibilityLabel}
          modifiers={[
            nativeAccessibilityLabel(accessibilityLabel),
            frame({ height: 36, minWidth: 96 }),
            controlSize('regular'),
            buttonBorderShape('capsule'),
            buttonStyle('bordered'),
          ]}
        >
          {options.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              onPress={() => onSelectionChange(option.value)}
              systemImage={option.value === selection ? 'checkmark' : undefined}
            />
          ))}
        </Menu>
      </Host>
    );
  }

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.detailMenu}
    >
      <Picker
        label={accessibilityLabel}
        modifiers={[
          nativeAccessibilityLabel(accessibilityLabel),
          pickerStyle('menu'),
        ]}
        onSelectionChange={onSelectionChange}
        selection={selection}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

export function NativeTimePicker({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: Date) => void;
  value: Date;
}) {
  const { theme } = useTracky();

  return (
    <DateTimePicker
      accentColor={theme.colors.accent}
      display="compact"
      mode="time"
      onValueChange={(_event, selectedDate) => onChange(selectedDate)}
      style={styles.nativePicker}
      themeVariant={theme.scheme}
      value={value}
    />
  );
}

export function NativeDatePicker({
  compact = false,
  label,
  onChange,
  value,
}: {
  compact?: boolean;
  label: string;
  onChange: (value: Date) => void;
  value: Date;
}) {
  const { theme } = useTracky();

  return (
    <DateTimePicker
      accentColor={theme.colors.accent}
      display="compact"
      mode="date"
      onValueChange={(_event, selectedDate) => onChange(selectedDate)}
      style={compact ? styles.compactDate : styles.nativePicker}
      themeVariant={theme.scheme}
      value={value}
    />
  );
}

export function NativeColorPicker({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const { theme } = useTracky();

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.fullWidth}
    >
      <ColorPicker
        label={label}
        onSelectionChange={(selection) => onChange(selection.slice(0, 7))}
        selection={value}
        supportsOpacity={false}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  compactDate: {
    height: 34,
    width: 154,
  },
  compactMenu: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    minWidth: 96,
    overflow: 'hidden',
  },
  detailMenu: {
    height: 44,
    minWidth: 96,
  },
  fullWidth: { width: '100%' },
  nativePicker: { height: 34 },
});
