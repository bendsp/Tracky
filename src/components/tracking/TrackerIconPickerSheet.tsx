import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { radius, spacing } from '../../design/theme';
import type { TrackerIconName } from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { NativeSheetScrollView } from '../NativeSheetScreen';
import { SectionHeader } from '../Screen';
import { selectionTile } from './selectionTile';
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
          <View key={group.title}>
            <SectionHeader>{group.title}</SectionHeader>
            <View
              style={[
                styles.group,
                {
                  backgroundColor: theme.colors.groupedSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
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
                      selectionTile.tile,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: isSelected
                          ? theme.colors.text
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
    gap: spacing.xs,
  },
  group: {
    alignSelf: 'stretch',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
});
