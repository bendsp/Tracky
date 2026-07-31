import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  resolveHabitColor,
  spacing,
  type as typography,
  type Theme,
} from '../../design/theme';
import type { DayPlanItem } from '../../domain/planning';
import { Icon } from '../Icon';
import { NativeRowMenu, type NativeMenuAction } from '../NativeControls';
import { TrackerIcon } from '../tracking/TrackerIcon';
import { RING_SIZE, ringIconSize } from '../tracking/progressRing';
import { TrackerProgressRing } from '../tracking/TrackerProgressRing';

export function DayItemRow({
  actions,
  divided,
  item,
  onComplete,
  onOpen,
  theme,
}: {
  actions: NativeMenuAction[];
  divided: boolean;
  item: DayPlanItem;
  onComplete: () => void;
  onOpen: () => void;
  theme: Theme;
}) {
  const standingColor = item.kind === 'task'
    ? theme.colors.text
    : resolveHabitColor(item.source.color, theme.dark);
  const completionLabel = item.kind === 'task'
    ? item.complete
      ? `Mark ${item.source.name} incomplete`
      : `Complete ${item.source.name}`
    : item.kind === 'tracker'
      ? `Check in ${item.source.name}, ${item.detail}`
      : `Open ${item.source.name} routine, ${item.detail}`;
  const actionLabel = item.skipped
    ? `Restore ${item.source.name} for this day`
    : completionLabel;

  return (
    <View
      style={[
        styles.row,
        divided && {
          borderTopColor: theme.colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole={item.kind === 'task' ? 'checkbox' : 'button'}
        accessibilityState={
          item.kind === 'task'
            ? { checked: item.complete }
            : { selected: item.complete }
        }
        hitSlop={4}
        onPress={onComplete}
        style={({ pressed }) => [
          styles.ringAction,
          { opacity: pressed ? 0.58 : 1 },
        ]}
      >
        <TrackerProgressRing
          color={standingColor}
          count={item.count}
          size={RING_SIZE.day}
          target={item.target}
          trackColor={theme.colors.separator}
        >
          {item.kind === 'task' ? (
            <Icon
              color={item.complete ? theme.colors.text : theme.colors.textSecondary}
              icon={Tick02Icon}
              size={ringIconSize(RING_SIZE.day)}
              strokeWidth={item.complete ? 2.2 : 1.7}
            />
          ) : (
            <TrackerIcon
              color={theme.colors.text}
              name={item.source.icon}
              size={ringIconSize(RING_SIZE.day)}
            />
          )}
        </TrackerProgressRing>
      </Pressable>

      <Pressable
        accessibilityHint={
          item.kind === 'routine'
            ? 'Opens the routine runner'
            : 'Opens item details'
        }
        accessibilityLabel={`${item.source.name}${item.detail ? `, ${item.detail}` : ''}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.main,
          { opacity: pressed ? 0.58 : 1 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.headline,
            {
              color:
                item.complete || item.skipped
                  ? theme.colors.textSecondary
                  : theme.colors.text,
            },
          ]}
        >
          {item.source.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.footnote, { color: theme.colors.textSecondary }]}
        >
          {item.skipped
            ? 'Skipped · tap the ring to restore'
            : item.detail || (item.complete ? 'Done' : item.kind === 'task' ? 'Not done' : 'Ready')}
        </Text>
      </Pressable>

      <View style={styles.more}>
        <NativeRowMenu
          accessibilityLabel={`More actions for ${item.source.name}`}
          actions={actions}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
    minHeight: 68,
    paddingVertical: spacing.sm,
  },
  more: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 44,
  },
  ringAction: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 72,
    paddingLeft: spacing.sm,
  },
});
