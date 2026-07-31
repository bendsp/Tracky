import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
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

type AgendaItem = Extract<DayPlanItem, { kind: 'routine' | 'task' }>;

const TIME_COLUMN = 42;
const CHECK_SIZE = 25;
/**
 * Steps hang under their routine's title rather than under its ring, so the
 * whole block reads as one thing with a heading instead of two lists.
 */
const STEP_INDENT =
  RING_SIZE.day + spacing.xs - CHECK_SIZE - spacing.sm;

function Check({ checked, theme }: { checked: boolean; theme: Theme }) {
  return (
    <View
      style={[
        styles.check,
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
          size={16}
          strokeWidth={2.3}
        />
      ) : null}
    </View>
  );
}

function Time({ theme, time }: { theme: Theme; time: string | null }) {
  if (!time) return null;
  return (
    <Text
      style={[
        typography.footnote,
        styles.time,
        { color: theme.colors.textTertiary },
      ]}
    >
      {time}
    </Text>
  );
}

export function AgendaItemRow({
  item,
  onCompleteTask,
  onLongPress,
  onOpen,
  onToggleRoutineStep,
  theme,
}: {
  item: AgendaItem;
  onCompleteTask: () => void;
  onLongPress: () => void;
  onOpen: () => void;
  onToggleRoutineStep: (stepId: string) => void;
  theme: Theme;
}) {
  // Expansion follows completion until the reader overrides it, so a finished
  // routine folds itself away without ever fighting a deliberate tap.
  const [override, setOverride] = useState<boolean | null>(null);

  if (item.kind === 'task') {
    return (
      <Pressable
        accessibilityHint="Long press for more actions."
        accessibilityLabel={`${item.source.name}${item.time ? `, ${item.time}` : ''}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.complete }}
        onLongPress={onLongPress}
        onPress={onCompleteTask}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.58 : 1 }]}
      >
        <Check checked={item.complete} theme={theme} />
        <Text
          numberOfLines={2}
          style={[
            typography.body,
            styles.name,
            {
              color: item.complete
                ? theme.colors.textSecondary
                : theme.colors.text,
            },
          ]}
        >
          {item.source.name}
        </Text>
        <Time theme={theme} time={item.time} />
      </Pressable>
    );
  }

  const steps = item.steps;
  const expanded = override ?? !item.complete;

  return (
    <View>
      <Pressable
        accessibilityHint="Opens the routine. Long press for more actions."
        accessibilityLabel={`${item.source.name}${item.time ? `, ${item.time}` : ''}, ${item.count} of ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} complete`}
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.routineRow,
          { opacity: pressed ? 0.58 : 1 },
        ]}
      >
        <TrackerProgressRing
          color={resolveHabitColor(item.source.color, theme.dark)}
          count={item.count}
          size={RING_SIZE.day}
          target={Math.max(1, steps.length)}
          trackColor={theme.colors.separator}
        >
          <TrackerIcon
            color={theme.colors.text}
            name={item.source.icon}
            size={ringIconSize(RING_SIZE.day)}
          />
        </TrackerProgressRing>
        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            style={[
              typography.headline,
              {
                color: item.complete
                  ? theme.colors.textSecondary
                  : theme.colors.text,
              },
            ]}
          >
            {item.source.name}
          </Text>
          <Text
            style={[typography.footnote, { color: theme.colors.textSecondary }]}
          >
            {item.complete
              ? 'Done'
              : `${item.count} of ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`}
          </Text>
        </View>
        <Time theme={theme} time={item.time} />
        {steps.length ? (
          <Pressable
            accessibilityLabel={
              expanded
                ? `Hide steps for ${item.source.name}`
                : `Show steps for ${item.source.name}`
            }
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            hitSlop={10}
            onPress={() => setOverride(!expanded)}
            style={({ pressed }) => [
              styles.disclosure,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Icon
              color={theme.colors.textTertiary}
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={18}
            />
          </Pressable>
        ) : null}
      </Pressable>

      {expanded
        ? steps.map((step) => {
            const complete = !!step.completedAt;
            return (
              <Pressable
                accessibilityLabel={`${complete ? 'Mark incomplete' : 'Complete'} ${step.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                key={step.id}
                onPress={() => onToggleRoutineStep(step.id)}
                style={({ pressed }) => [
                  styles.step,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Check checked={complete} theme={theme} />
                <Text
                  numberOfLines={2}
                  style={[
                    typography.body,
                    styles.name,
                    {
                      color: complete
                        ? theme.colors.textSecondary
                        : theme.colors.text,
                    },
                  ]}
                >
                  {step.name}
                </Text>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: CHECK_SIZE,
    justifyContent: 'center',
    width: CHECK_SIZE,
  },
  copy: { flex: 1, gap: spacing.xxs, justifyContent: 'center' },
  disclosure: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 32,
  },
  name: { flex: 1 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingVertical: spacing.xxs,
  },
  routineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 64,
    paddingVertical: spacing.xxs,
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
    paddingLeft: STEP_INDENT,
  },
  time: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: TIME_COLUMN,
  },
});
