import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  radius,
  spacing,
  type as typography,
} from '../../design/theme';
import type { TrackerIconName } from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { NativeSheetScrollView } from '../NativeSheetScreen';
import {
  TrackerIcon,
  trackerIconOptions,
} from './TrackerIcon';

const iconGroups: {
  icons: TrackerIconName[];
  title: string;
}[] = [
  {
    title: 'General',
    icons: ['star', 'heart', 'leaf', 'droplet'],
  },
  {
    title: 'Wellness',
    icons: ['meditation', 'activity', 'sleep', 'food', 'coffee'],
  },
  {
    title: 'Work & Interests',
    icons: ['computer', 'book', 'music'],
  },
];

const labels = new Map(
  trackerIconOptions.map((option) => [option.value, option.label]),
);

export function TrackerIconPicker({
  onSelect,
  selected,
}: {
  onSelect: (icon: TrackerIconName) => void;
  selected: TrackerIconName;
}) {
  const { theme } = useTracky();

  return (
    <NativeSheetScrollView
      contentContainerStyle={styles.content}
    >
        {iconGroups.map((group) => (
          <View
            key={group.title}
            style={[
              styles.group,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[typography.groupTitle, { color: theme.colors.text }]}
            >
              {group.title}
            </Text>
            <View style={styles.grid}>
              {group.icons.map((icon) => {
                const isSelected = selected === icon;
                return (
                  <Pressable
                    accessibilityLabel={`${labels.get(icon) ?? icon} icon`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={icon}
                    onPress={() => {
                      selectionHaptic();
                      onSelect(icon);
                    }}
                    style={({ pressed }) => [
                      styles.iconChoice,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: isSelected
                          ? theme.colors.textSecondary
                          : 'transparent',
                        opacity: pressed ? 0.62 : 1,
                      },
                    ]}
                  >
                    <TrackerIcon
                      color={theme.colors.text}
                      name={icon}
                      size={28}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
    </NativeSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  group: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  iconChoice: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
});
