import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
  type Theme,
} from '../../design/theme';
import type { DayPlanItem } from '../../domain/planning';
import { Icon } from '../Icon';
import { TrackerIcon } from '../tracking/TrackerIcon';
import { RING_SIZE, ringIconSize } from '../tracking/progressRing';
import { TrackerProgressRing } from '../tracking/TrackerProgressRing';

/**
 * Ring where there's a count, checkbox where there's a binary. A habit is a
 * rate and a routine has steps, so both earn a ring; a task is done or it
 * isn't, and drawing that as a one-segment ring puts a progress indicator on
 * something with no progress.
 */
const CHECKBOX_SIZE = 24;

function Checkbox({
  checked,
  theme,
}: {
  checked: boolean;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: checked ? theme.colors.accent : 'transparent',
          borderColor: checked ? theme.colors.accent : theme.colors.separator,
        },
      ]}
    >
      {checked ? (
        <Icon
          color={theme.colors.onAccent}
          icon={Tick02Icon}
          size={15}
          strokeWidth={2.4}
        />
      ) : null}
    </View>
  );
}

export function DayItemRow({
  item,
  onComplete,
  onLongPress,
  onOpen,
  onToggleStep,
  theme,
}: {
  item: DayPlanItem;
  onComplete: () => void;
  onLongPress: () => void;
  onOpen: () => void;
  onToggleStep: (stepId: string) => void;
  theme: Theme;
}) {
  const dimmed = item.complete || item.skipped;
  const nameColor = dimmed ? theme.colors.textSecondary : theme.colors.text;
  const detail = item.skipped ? 'Skipped' : item.detail;

  if (item.kind === 'task') {
    return (
      <Pressable
        accessibilityHint="Opens task details"
        accessibilityLabel={`${item.source.name}${detail ? `, ${detail}` : ''}`}
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onOpen}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.58 : 1 }]}
      >
        <Pressable
          accessibilityLabel={
            item.complete
              ? `Mark ${item.source.name} incomplete`
              : `Complete ${item.source.name}`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.complete }}
          hitSlop={12}
          onPress={onComplete}
          style={({ pressed }) => [
            styles.leading,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Checkbox checked={item.complete} theme={theme} />
        </Pressable>
        <Text
          numberOfLines={2}
          style={[typography.body, styles.name, { color: nameColor }]}
        >
          {item.source.name}
        </Text>
        {detail ? (
          <Text
            style={[typography.footnote, { color: theme.colors.textTertiary }]}
          >
            {detail}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  const standingColor = resolveHabitColor(item.source.color, theme.dark);
  // A finished or skipped routine collapses back to its own row. Its steps
  // have nothing left to tell you, and leaving six ticked lines in the day is
  // how a routine stops earning the space it takes.
  const steps =
    item.kind === 'routine' && !item.complete && !item.skipped
      ? item.steps
      : [];

  return (
    <View>
      <Pressable
        accessibilityHint={
          item.kind === 'routine'
            ? 'Opens the routine'
            : 'Opens habit details'
        }
        accessibilityLabel={`${item.source.name}${detail ? `, ${detail}` : ''}`}
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.standingRow,
          { opacity: pressed ? 0.58 : 1 },
        ]}
      >
        <Pressable
          accessibilityLabel={
            item.skipped
              ? `Restore ${item.source.name} for this day`
              : item.kind === 'tracker'
                ? `Check in ${item.source.name}, ${item.detail}`
                : `Open ${item.source.name}, ${item.detail}`
          }
          accessibilityRole="button"
          accessibilityState={{ selected: item.complete }}
          hitSlop={6}
          onPress={onComplete}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <TrackerProgressRing
            color={standingColor}
            count={item.count}
            size={RING_SIZE.day}
            target={item.target}
            trackColor={theme.colors.separator}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={item.source.icon}
              size={ringIconSize(RING_SIZE.day)}
            />
          </TrackerProgressRing>
        </Pressable>
        <View style={styles.standingCopy}>
          <Text
            numberOfLines={1}
            style={[typography.headline, { color: nameColor }]}
          >
            {item.source.name}
          </Text>
          {detail ? (
            <Text
              numberOfLines={1}
              style={[
                typography.footnote,
                { color: theme.colors.textSecondary },
              ]}
            >
              {detail}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {steps.map((step) => {
        const done = !!step.completedAt;
        return (
          <Pressable
            accessibilityLabel={`${done ? 'Mark incomplete' : 'Complete'} ${step.name}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            key={step.id}
            onPress={() => onToggleStep(step.id)}
            style={({ pressed }) => [
              styles.stepRow,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <View style={styles.leading}>
              <Checkbox checked={done} theme={theme} />
            </View>
            <Text
              numberOfLines={2}
              style={[
                typography.body,
                styles.name,
                {
                  color: done
                    ? theme.colors.textSecondary
                    : theme.colors.text,
                },
              ]}
            >
              {step.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: CHECKBOX_SIZE,
    justifyContent: 'center',
    width: CHECKBOX_SIZE,
  },
  leading: { alignItems: 'center', width: CHECKBOX_SIZE },
  name: { flex: 1 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xxs,
  },
  standingCopy: { flex: 1, gap: spacing.xxs },
  standingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
    paddingVertical: spacing.xxs,
  },
  // Steps sit under their routine rather than beside it, so the indent is
  // measured from the routine's ring instead of matching the task column.
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 38,
    paddingLeft: spacing.xxl,
  },
});
