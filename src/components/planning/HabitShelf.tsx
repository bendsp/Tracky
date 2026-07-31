import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  resolveHabitColor,
  spacing,
  type as typography,
  type Theme,
} from '../../design/theme';
import type { DayPlanItem } from '../../domain/planning';
import { TrackerIcon } from '../tracking/TrackerIcon';
import { RING_SIZE, ringIconSize } from '../tracking/progressRing';
import { TrackerProgressRing } from '../tracking/TrackerProgressRing';

type HabitItem = Extract<DayPlanItem, { kind: 'tracker' }>;

export function HabitShelf({
  habits,
  onCheckIn,
  onEdit,
  onLongPress,
  onOpen,
  onSkip,
  theme,
}: {
  habits: HabitItem[];
  onCheckIn: (habit: HabitItem) => void;
  onEdit: (habit: HabitItem) => void;
  onLongPress: (habit: HabitItem) => void;
  onOpen: (habit: HabitItem) => void;
  onSkip: (habit: HabitItem) => void;
  theme: Theme;
}) {
  const accessibilityActions = [
    { label: 'Edit Habit', name: 'edit' },
    { label: 'Skip This Day', name: 'skip' },
  ];

  const handleAccessibilityAction = (
    habit: HabitItem,
    actionName: string,
  ) => {
    if (actionName === 'edit') onEdit(habit);
    if (actionName === 'skip') onSkip(habit);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {habits.map((habit) => (
        <View key={habit.id} style={styles.habit}>
          <Pressable
            accessibilityActions={accessibilityActions}
            accessibilityLabel={
              habit.complete
                ? `Undo the latest ${habit.source.name} check-in, ${habit.detail}`
                : `Check in ${habit.source.name}, ${habit.detail}`
            }
            accessibilityRole="button"
            accessibilityState={{ selected: habit.complete }}
            accessibilityHint="Long press for more actions"
            onAccessibilityAction={(event) =>
              handleAccessibilityAction(habit, event.nativeEvent.actionName)
            }
            onLongPress={() => onLongPress(habit)}
            onPress={() => onCheckIn(habit)}
            style={({ pressed }) => [
              styles.ring,
              { opacity: pressed ? 0.58 : 1 },
            ]}
          >
            <TrackerProgressRing
              color={resolveHabitColor(habit.source.color, theme.dark)}
              count={habit.count}
              size={RING_SIZE.day}
              target={habit.target}
              trackColor={theme.colors.separator}
            >
              <TrackerIcon
                color={theme.colors.text}
                name={habit.source.icon}
                size={ringIconSize(RING_SIZE.day)}
              />
            </TrackerProgressRing>
          </Pressable>
          <Pressable
            accessibilityActions={accessibilityActions}
            accessibilityLabel={`Open ${habit.source.name} habit`}
            accessibilityRole="button"
            accessibilityHint="Long press for more actions"
            onAccessibilityAction={(event) =>
              handleAccessibilityAction(habit, event.nativeEvent.actionName)
            }
            onLongPress={() => onLongPress(habit)}
            onPress={() => onOpen(habit)}
            style={({ pressed }) => ({ opacity: pressed ? 0.58 : 1 })}
          >
            <Text
              numberOfLines={2}
              style={[
                typography.caption,
                styles.name,
                {
                  color: habit.complete
                    ? theme.colors.textSecondary
                    : theme.colors.text,
                },
              ]}
            >
              {habit.source.name}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingHorizontal: spacing.xxs },
  habit: { alignItems: 'center', width: 68 },
  name: { marginTop: spacing.xs, minHeight: 32, textAlign: 'center' },
  ring: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
});
