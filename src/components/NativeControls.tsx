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
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { radius } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';

export type NativeMenuAction = {
  destructive?: boolean;
  id: string;
  label: string;
  onPress: () => void;
  systemImage?: SFSymbol;
};

/**
 * The trailing menu on a list row. This is a real SwiftUI `Menu`, so it gets
 * the system popover, its blur, its dismissal and its symbol alignment — the
 * hand-rolled alternative is a text glyph opening an `Alert`, which reads as an
 * error dialog rather than a menu.
 */
export function NativeRowMenu({
  accessibilityLabel,
  actions,
}: {
  accessibilityLabel: string;
  actions: NativeMenuAction[];
}) {
  const { theme } = useTracky();

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents
      seedColor={theme.colors.accent}
      style={styles.rowMenu}
    >
      <Menu
        label=""
        modifiers={[
          nativeAccessibilityLabel(accessibilityLabel),
          buttonStyle('borderless'),
          controlSize('regular'),
          tint(theme.colors.textTertiary),
          frame({ height: 44, width: 44 }),
        ]}
        systemImage="ellipsis.circle"
      >
        {actions.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            onPress={action.onPress}
            role={action.destructive ? 'destructive' : 'default'}
            systemImage={action.systemImage}
          />
        ))}
      </Menu>
    </Host>
  );
}

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

/**
 * A menu that picks one of several actions from inside a form row. An `Alert`
 * with one button per option is the usual shortcut here and it's the wrong
 * control — alerts interrupt to report something, menus offer a choice.
 */
export function NativeActionMenu({
  accessibilityLabel,
  actions,
  label,
}: {
  accessibilityLabel: string;
  actions: NativeMenuAction[];
  label: string;
}) {
  const { theme } = useTracky();

  return (
    <Host
      colorScheme={theme.scheme}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.accent}
      style={styles.actionMenu}
    >
      <Menu
        label={label}
        modifiers={[
          nativeAccessibilityLabel(accessibilityLabel),
          buttonStyle('borderless'),
          controlSize('regular'),
          tint(theme.colors.accent),
          frame({ height: 44 }),
        ]}
      >
        {actions.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            onPress={action.onPress}
            role={action.destructive ? 'destructive' : 'default'}
            systemImage={action.systemImage}
          />
        ))}
      </Menu>
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
  actionMenu: { minWidth: 120 },
  compactDate: {
    height: 34,
    width: 154,
  },
  compactMenu: {
    borderRadius: radius.pill,
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
  rowMenu: { height: 44, width: 44 },
});
