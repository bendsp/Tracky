import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  MinusSignIcon,
  PencilEdit02Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  contrastingInk,
  habitColors,
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../../design/theme';
import type {
  DaySchedule,
  TrackerDraft,
  TrackerGoalPeriod,
} from '../../domain/models';
import { localTimeOf } from '../../domain/planning';
import { simplifiedTrackerSchedule } from '../../domain/trackerDraft';
import {
  goalPeriodLabels,
  localDateKey,
} from '../../domain/tracking';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { Field } from '../Form';
import { GlassButton } from '../GlassButton';
import { Icon } from '../Icon';
import { NativeSheetScrollView } from '../NativeSheetScreen';
import {
  NativeMenuPicker,
  NativeTimePicker,
  NativeToggle,
} from '../NativeControls';
import { SectionHeader } from '../Screen';
import { selectionTile } from './selectionTile';
import { TrackerIcon } from './TrackerIcon';

export function TrackerEditorForm({
  draft,
  onChooseIcon,
  onChooseStartDate,
  onDraftChange,
}: {
  draft: TrackerDraft;
  onChooseIcon: () => void;
  onChooseStartDate: () => void;
  onDraftChange: (
    update: TrackerDraft | ((current: TrackerDraft) => TrackerDraft),
  ) => void;
}) {
  const { theme } = useTracky();

  return (
    <NativeSheetScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.form}
    >
        <View style={styles.iconPreviewArea}>
          <Pressable
            accessibilityHint="Opens the icon picker"
            accessibilityLabel="Choose habit icon"
            accessibilityRole="button"
            onPress={onChooseIcon}
            style={({ pressed }) => [
              styles.iconPreview,
              {
                backgroundColor: theme.colors.groupedSurface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={draft.icon}
              size={50}
            />
          </Pressable>
          <View style={styles.iconMenu}>
            <GlassButton
              accessibilityLabel="Choose habit icon"
              compact
              icon={PencilEdit02Icon}
              onPress={onChooseIcon}
            />
          </View>
        </View>

        <Field
          autoCapitalize="sentences"
          label="Name"
          onChangeText={(name) =>
            onDraftChange((current) => ({ ...current, name }))
          }
          pill
          placeholder="Read, stretch, call Mum…"
          value={draft.name}
        />

        <View>
          <SectionHeader>Color</SectionHeader>
          <View style={selectionTile.grid}>
            {habitColors.map((option) => {
              const selected = draft.color === option.value;
              const swatchColor = resolveHabitColor(option.value, theme.dark);
              return (
                <Pressable
                  accessibilityLabel={`${option.label} habit color`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => {
                    selectionHaptic();
                    onDraftChange((current) => ({
                      ...current,
                      color: option.value,
                    }));
                  }}
                  style={({ pressed }) => [
                    selectionTile.tile,
                    {
                      backgroundColor: swatchColor,
                      borderColor: selected
                        ? theme.colors.text
                        : 'transparent',
                      opacity: pressed ? 0.68 : 1,
                    },
                  ]}
                >
                  {selected ? (
                    <Icon
                      color={contrastingInk(swatchColor)}
                      icon={Tick02Icon}
                      size={22}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <SectionHeader>Goal</SectionHeader>
          <View
            style={[
              styles.goalCard,
              {
                backgroundColor: theme.colors.groupedSurface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.targetRow}>
              <Text style={[typography.body, { color: theme.colors.text }]}>
                Times
              </Text>
              <View
                accessibilityLabel={`${draft.goal.targetCount} times every ${goalPeriodLabels[draft.goal.period]}`}
                style={[
                  styles.stepper,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Pressable
                  accessibilityLabel="Decrease goal count"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: draft.goal.targetCount <= 1 }}
                  disabled={draft.goal.targetCount <= 1}
                  hitSlop={6}
                  onPress={() => {
                    selectionHaptic();
                    onDraftChange((current) => ({
                      ...current,
                      goal: {
                        ...current.goal,
                        targetCount: Math.max(
                          1,
                          current.goal.targetCount - 1,
                        ),
                      },
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    {
                      opacity:
                        draft.goal.targetCount <= 1
                          ? 0.3
                          : pressed
                            ? 0.55
                            : 1,
                    },
                  ]}
                >
                  <Icon
                    color={theme.colors.text}
                    icon={MinusSignIcon}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
                <Text
                  style={[
                    typography.headline,
                    styles.stepperValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {draft.goal.targetCount}
                </Text>
                <Pressable
                  accessibilityLabel="Increase goal count"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: draft.goal.targetCount >= 99 }}
                  disabled={draft.goal.targetCount >= 99}
                  hitSlop={6}
                  onPress={() => {
                    selectionHaptic();
                    onDraftChange((current) => ({
                      ...current,
                      goal: {
                        ...current.goal,
                        targetCount: Math.min(
                          99,
                          current.goal.targetCount + 1,
                        ),
                      },
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    { opacity: pressed ? 0.55 : 1 },
                  ]}
                >
                  <Icon
                    color={theme.colors.text}
                    icon={Add01Icon}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
            </View>
            <View
              style={[
                styles.goalDivider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <View style={styles.periodRow}>
              <Text style={[typography.body, { color: theme.colors.text }]}>
                Every
              </Text>
              <NativeMenuPicker<TrackerGoalPeriod>
                accessibilityLabel="Goal period"
                label={goalPeriodLabels[draft.goal.period]}
                onSelectionChange={(period) => {
                  selectionHaptic();
                  onDraftChange((current) => ({
                    ...current,
                    goal: { ...current.goal, period },
                  }));
                }}
                options={(
                  Object.entries(goalPeriodLabels) as [
                    TrackerGoalPeriod,
                    string,
                  ][]
                ).map(([value, label]) => ({ label, value }))}
                selection={draft.goal.period}
              />
            </View>
            <View
              style={[
                styles.goalDivider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <Pressable
              accessibilityHint="Opens the date picker"
              accessibilityLabel={`Start date, ${formattedStartDate(draft.goal.startDate)}`}
              accessibilityRole="button"
              onPress={() => {
                selectionHaptic();
                onChooseStartDate();
              }}
              style={({ pressed }) => [
                styles.startDateRow,
                { opacity: pressed ? 0.58 : 1 },
              ]}
            >
              <View style={styles.startDateLabel}>
                <Icon
                  color={theme.colors.text}
                  icon={Calendar03Icon}
                  size={20}
                  strokeWidth={1.8}
                />
                <Text style={[typography.body, { color: theme.colors.text }]}>
                  Start Date
                </Text>
              </View>
              <View
                style={[
                styles.dateValue,
                styles.inlineControl,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[typography.body, { color: theme.colors.text }]}
                >
                  {formattedStartDate(draft.goal.startDate)}
                </Text>
                <Icon
                  color={theme.colors.textTertiary}
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.8}
                />
              </View>
            </Pressable>
          </View>
        </View>

        <View>
          <SectionHeader>Time</SectionHeader>
          <View
            style={[
              styles.timeCard,
              {
                backgroundColor: theme.colors.groupedSurface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.timeToggleRow}>
              <Text style={[typography.body, { color: theme.colors.text }]}>Time</Text>
              <NativeToggle
                label="Set a time"
                onChange={(enabled) => {
                  selectionHaptic();
                  onDraftChange((current) => ({
                    ...current,
                    schedule: simplifiedTrackerSchedule(
                      current.schedule,
                      enabled ? current.schedule.time ?? '09:00' : null,
                    ),
                  }));
                }}
                value={draft.schedule.time !== null}
              />
            </View>
            {draft.schedule.time ? (
              <>
                <View
                  style={[
                    styles.timeDivider,
                    { backgroundColor: theme.colors.separator },
                  ]}
                />
                <View style={styles.timePickerRow}>
                  <Text style={[typography.body, { color: theme.colors.text }]}>At</Text>
                  <NativeTimePicker
                    compact
                    label="Time"
                    onChange={(date) => {
                      const time = localTimeOf(date);
                      onDraftChange((current) => ({
                        ...current,
                        schedule: simplifiedTrackerSchedule(
                          current.schedule,
                          time,
                        ),
                      }));
                    }}
                    value={timeDate(draft.schedule.time)}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
    </NativeSheetScrollView>
  );
}

function timeDate(value: DaySchedule['time']) {
  const date = new Date();
  const [hour, minute] = (value ?? '09:00').split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formattedStartDate(value: string) {
  if (value === localDateKey(new Date())) return 'Today';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xs,
  },
  iconPreviewArea: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 132,
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    width: 132,
  },
  iconPreview: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  iconMenu: {
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  goalCard: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  targetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
  timeCard: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  timeDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xs,
  },
  timePickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
  timeToggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
  stepper: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 36,
    overflow: 'hidden',
  },
  stepperButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepperValue: {
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    textAlign: 'center',
  },
  goalDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xs,
  },
  startDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
  },
  startDateLabel: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineControl: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
  },
  dateValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
});
