import {
  ColorPicker,
  DatePicker,
  Host,
  Picker,
  Text,
} from '@expo/ui/swift-ui';
import {
  datePickerStyle,
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
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.fullWidth}
    >
      <DatePicker
        displayedComponents={['hourAndMinute']}
        modifiers={[datePickerStyle('compact')]}
        onDateChange={onChange}
        selection={value}
        title={label}
      />
    </Host>
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
  fullWidth: { width: '100%' },
});
