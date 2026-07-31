import {
  Add01Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type as typography } from '../../design/theme';
import type {
  DaySchedule,
  ISOWeekday,
} from '../../domain/models';
import {
  weekdayLabels,
} from '../../domain/planning';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { ChoiceChip } from '../Form';
import { Icon } from '../Icon';
import { NativeTimePicker } from '../NativeControls';
import { SectionHeader } from '../Screen';

const weekdays = [1, 2, 3, 4, 5, 6, 7] as ISOWeekday[];

function timeDate(value: string | null) {
  const date = new Date();
  const [hour, minute] = (value ?? '09:00').split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function localTime(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(
    value.getMinutes(),
  ).padStart(2, '0')}`;
}

export function ScheduleEditor({
  onChange,
  schedule,
}: {
  onChange: (schedule: DaySchedule) => void;
  schedule: DaySchedule;
}) {
  const { theme } = useTracky();
  const weekly = schedule.recurrence.frequency === 'weekly';

  const update = (patch: Partial<DaySchedule>) => {
    onChange({ ...schedule, ...patch });
  };

  return (
    <>
      <View>
        <SectionHeader>Time</SectionHeader>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.groupedSurface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.controlRow}>
            <View style={styles.controlCopy}>
              <Text style={[typography.body, { color: theme.colors.text }]}>At</Text>
              <Text
                style={[
                  typography.footnote,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {schedule.time ? 'Orders it here and enables a local reminder' : 'No exact time'}
              </Text>
            </View>
            {schedule.time ? (
              <NativeTimePicker
                label="Time"
                onChange={(date) => update({ time: localTime(date) })}
                value={timeDate(schedule.time)}
              />
            ) : (
              <Pressable
                accessibilityLabel="Add a time"
                accessibilityRole="button"
                onPress={() => update({ time: '09:00' })}
                style={({ pressed }) => [
                  styles.textButton,
                  { opacity: pressed ? 0.55 : 1 },
                ]}
              >
                <Text style={[typography.headline, { color: theme.colors.accent }]}>Add time</Text>
              </Pressable>
            )}
          </View>
          {schedule.time ? (
            <Pressable
              accessibilityLabel="Remove time"
              accessibilityRole="button"
              onPress={() => update({ time: null })}
              style={({ pressed }) => [
                styles.removeTime,
                {
                  borderTopColor: theme.colors.separator,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text style={[typography.body, { color: theme.colors.textSecondary }]}>No exact time</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <SectionHeader>Repeat</SectionHeader>
        <View style={styles.chips}>
          <ChoiceChip
            label="Daily"
            onPress={() =>
              update({
                recurrence: {
                  frequency: 'daily',
                  interval: schedule.recurrence.interval,
                },
              })
            }
            selected={!weekly}
          />
          <ChoiceChip
            label="Weekly"
            onPress={() =>
              update({
                recurrence: {
                  frequency: 'weekly',
                  interval: schedule.recurrence.interval,
                  weekdays: [1, 2, 3, 4, 5, 6, 7],
                },
              })
            }
            selected={weekly}
          />
        </View>
        <View
          style={[
            styles.intervalCard,
            {
              backgroundColor: theme.colors.groupedSurface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[typography.body, { color: theme.colors.text }]}>Every</Text>
          <View
            style={[
              styles.stepper,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <StepperButton
              disabled={schedule.recurrence.interval <= 1}
              icon="minus"
              label="Decrease repeat interval"
              onPress={() =>
                update({
                  recurrence: {
                    ...schedule.recurrence,
                    interval: Math.max(1, schedule.recurrence.interval - 1),
                  },
                })
              }
            />
            <Text
              style={[
                typography.headline,
                styles.intervalValue,
                { color: theme.colors.text },
              ]}
            >
              {schedule.recurrence.interval}
            </Text>
            <StepperButton
              disabled={schedule.recurrence.interval >= 52}
              icon="plus"
              label="Increase repeat interval"
              onPress={() =>
                update({
                  recurrence: {
                    ...schedule.recurrence,
                    interval: Math.min(52, schedule.recurrence.interval + 1),
                  },
                })
              }
            />
          </View>
          <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
            {weekly ? 'weeks' : 'days'}
          </Text>
        </View>
        {schedule.recurrence.frequency === 'weekly' ? (
          <View style={[styles.chips, styles.weekdays]}>
            {weekdays.map((weekday) => {
              const selected = schedule.recurrence.frequency === 'weekly' &&
                schedule.recurrence.weekdays.includes(weekday);
              return (
                <ChoiceChip
                  key={weekday}
                  label={weekdayLabels[weekday].slice(0, 3)}
                  onPress={() => {
                    if (schedule.recurrence.frequency !== 'weekly') return;
                    const next = selected
                      ? schedule.recurrence.weekdays.filter((day) => day !== weekday)
                      : [...schedule.recurrence.weekdays, weekday].sort();
                    if (!next.length) return;
                    update({
                      recurrence: {
                        ...schedule.recurrence,
                        weekdays: next,
                      },
                    });
                  }}
                  selected={selected}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </>
  );
}

function StepperButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTracky();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.stepperButton,
        { opacity: disabled ? 0.28 : pressed ? 0.55 : 1 },
      ]}
    >
      <Icon
        color={theme.colors.text}
        icon={icon === 'minus' ? MinusSignIcon : Add01Icon}
        size={18}
        strokeWidth={2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  controlCopy: { flex: 1, gap: spacing.xxs },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  intervalCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  intervalValue: { fontVariant: ['tabular-nums'], minWidth: 24, textAlign: 'center' },
  removeTime: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    justifyContent: 'center',
  },
  stepper: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 36,
    marginLeft: 'auto',
  },
  stepperButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  textButton: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  weekdays: { marginTop: spacing.sm },
});
