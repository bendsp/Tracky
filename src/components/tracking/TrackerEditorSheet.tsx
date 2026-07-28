import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  MinusSignIcon,
  PencilEdit02Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  defaultHabitColor,
  habitColors,
  normalizeHabitColor,
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../../design/theme';
import type {
  Tracker,
  TrackerDraft,
  TrackerGoalPeriod,
} from '../../domain/models';
import {
  goalPeriodLabels,
  localDateKey,
} from '../../domain/tracking';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { Field } from '../Form';
import { GlassButton } from '../GlassButton';
import { Icon } from '../Icon';
import {
  NativeMenuPicker,
} from '../NativeControls';
import { Sheet } from '../Sheet';
import { TrackerIcon } from './TrackerIcon';
import { TrackerIconPickerSheet } from './TrackerIconPickerSheet';
import { TrackerStartDateSheet } from './TrackerStartDateSheet';

function baseSummary(): TrackerDraft['summary'] {
  return {
    calculation: 'count',
    timeframe: 'today',
    countLabel: 'check-ins',
  };
}

function newDraft(): TrackerDraft {
  return {
    name: '',
    icon: 'star',
    color: defaultHabitColor,
    goal: {
      targetCount: 1,
      period: 'day',
      startDate: localDateKey(new Date()),
    },
    fields: [],
    summary: baseSummary(),
  };
}

function editableDraft(tracker: Tracker): TrackerDraft {
  return {
    name: tracker.name,
    icon: tracker.icon,
    color: normalizeHabitColor(tracker.color),
    goal: { ...tracker.goal },
    fields: tracker.fields.map((field) =>
      field.type === 'choice'
        ? { ...field, choices: [...field.choices] }
        : { ...field },
    ),
    summary: { ...tracker.summary },
  };
}

export function TrackerEditorSheet({
  onClose,
  tracker,
  visible,
}: {
  onClose: () => void;
  tracker?: Tracker | null;
  visible: boolean;
}) {
  const { createTracker, theme, updateTracker } = useTracky();
  const [draft, setDraft] = useState<TrackerDraft>(newDraft);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIconPickerOpen(false);
    setStartDatePickerOpen(false);
    setDraft(tracker ? editableDraft(tracker) : newDraft());
  }, [tracker, visible]);

  const save = () => {
    if (!draft.name.trim()) return;
    const simpleDraft: TrackerDraft = tracker
      ? {
          ...draft,
          fields: tracker.fields,
          summary: tracker.summary,
        }
      : {
          ...draft,
          fields: [],
          summary: baseSummary(),
        };
    if (tracker) updateTracker(tracker.id, simpleDraft);
    else createTracker(simpleDraft);
    onClose();
  };

  return (
    <Sheet
      confirmDisabled={!draft.name.trim()}
      confirmLabel={tracker ? 'Save' : 'Add'}
      onClose={onClose}
      onConfirm={save}
      size="large"
      title={tracker ? 'Edit Tracker' : 'New Tracker'}
      visible={visible}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.viewport}
      >
        <View style={styles.iconPreviewArea}>
          <Pressable
            accessibilityHint="Opens the icon picker"
            accessibilityLabel="Choose tracker icon"
            accessibilityRole="button"
            onPress={() => setIconPickerOpen(true)}
            style={({ pressed }) => [
              styles.iconPreview,
              {
                backgroundColor: theme.colors.surfaceMuted,
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
              accessibilityLabel="Choose tracker icon"
              compact
              icon={PencilEdit02Icon}
              onPress={() => setIconPickerOpen(true)}
            />
          </View>
        </View>

        <Field
          autoCapitalize="sentences"
          label="Name"
          onChangeText={(name) =>
            setDraft((current) => ({ ...current, name }))
          }
          pill
          placeholder="Read, stretch, call Mum…"
          value={draft.name}
        />

        <View style={styles.colorField}>
          <Text style={[typography.eyebrow, { color: theme.colors.textSecondary }]}>
            Color
          </Text>
          <View style={styles.colorGrid}>
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
                    setDraft((current) => ({
                      ...current,
                      color: option.value,
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.colorChoice,
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
                      color={swatchForeground(swatchColor)}
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

        <View style={styles.goalField}>
          <Text style={[typography.eyebrow, { color: theme.colors.textSecondary }]}>
            Goal
          </Text>
          <View
            style={[
              styles.goalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.goalRow}>
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
                    setDraft((current) => ({
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
                <Text style={[styles.stepperValue, { color: theme.colors.text }]}>
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
                    setDraft((current) => ({
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
              <Text
                numberOfLines={1}
                style={[styles.timesEvery, { color: theme.colors.text }]}
              >
                times every
              </Text>
              <NativeMenuPicker<TrackerGoalPeriod>
                accessibilityLabel="Goal period"
                compact
                label={goalPeriodLabels[draft.goal.period]}
                onSelectionChange={(period) => {
                  selectionHaptic();
                  setDraft((current) => ({
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
                setStartDatePickerOpen(true);
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
                <Text style={[styles.rowLabelText, { color: theme.colors.text }]}>
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
                  style={[styles.rowControlText, { color: theme.colors.text }]}
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
      </ScrollView>
      <TrackerIconPickerSheet
        onClose={() => setIconPickerOpen(false)}
        onSelect={(icon) =>
          setDraft((current) => ({
            ...current,
            icon,
          }))
        }
        selected={draft.icon}
        visible={iconPickerOpen}
      />
      <TrackerStartDateSheet
        onClose={() => setStartDatePickerOpen(false)}
        onSelect={(startDate) =>
          setDraft((current) => ({
            ...current,
            goal: { ...current.goal, startDate },
          }))
        }
        selected={draft.goal.startDate}
        visible={startDatePickerOpen}
      />
    </Sheet>
  );
}

function swatchForeground(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.64 ? '#0A0A0A' : '#FFFFFF';
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
  viewport: { flex: 1 },
  form: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
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
  colorField: { gap: spacing.sm },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChoice: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  goalField: { gap: spacing.sm },
  goalCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  goalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    height: 56,
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
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    letterSpacing: -0.15,
    minWidth: 24,
    textAlign: 'center',
  },
  timesEvery: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.15,
    lineHeight: 21,
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
  rowControlText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.15,
  },
  rowLabelText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.15,
  },
});
