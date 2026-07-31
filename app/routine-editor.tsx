import { Add01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '../src/components/Form';
import { Icon } from '../src/components/Icon';
import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import { ScheduleEditor } from '../src/components/planning/ScheduleEditor';
import { SectionHeader } from '../src/components/Screen';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import {
  contrastingInk,
  defaultHabitColor,
  habitColors,
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../src/design/theme';
import {
  trackerIconNames,
  type RoutineDraft,
  type RoutineStep,
  type TrackerIconName,
} from '../src/domain/models';
import { defaultDaySchedule } from '../src/domain/planning';
import { localDateKey } from '../src/domain/tracking';
import { requestPlanningNotificationPermission } from '../src/notifications/PlanningNotificationRuntime';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

function stepId() {
  return `routine_step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function RoutineEditorScreen() {
  const { routineId, taskId, taskName } = useLocalSearchParams<{
    routineId?: string;
    taskId?: string;
    taskName?: string;
  }>();
  const router = useRouter();
  const {
    createRoutine,
    deleteRoutine,
    deleteTask,
    routines,
    tasks,
    theme,
    updateRoutine,
  } = useTracky();
  const existing = routines.find((routine) => routine.id === routineId) ?? null;
  const sourceTask = tasks.find((task) => task.id === taskId) ?? null;
  const initial = useMemo<RoutineDraft>(() => {
    if (existing) {
      return {
        name: existing.name,
        icon: existing.icon,
        color: existing.color,
        schedule: {
          ...existing.schedule,
          exceptions: existing.schedule.exceptions.map((item) => ({ ...item })),
          recurrence: existing.schedule.recurrence.frequency === 'weekly'
            ? {
                ...existing.schedule.recurrence,
                weekdays: [...existing.schedule.recurrence.weekdays],
              }
            : { ...existing.schedule.recurrence },
        },
        steps: existing.steps.map((step) => ({ ...step })),
      };
    }
    const importedName = taskName?.trim() || sourceTask?.name || '';
    return {
      name: importedName ? `${importedName} routine` : '',
      icon: 'star',
      color: defaultHabitColor,
      schedule: {
        ...defaultDaySchedule(sourceTask?.scheduledDate ?? localDateKey(new Date())),
        time: sourceTask?.time ?? null,
      },
      steps: importedName
        ? [
            {
              id: stepId(),
              name: importedName,
            },
          ]
        : [{ id: stepId(), name: '' }],
    };
  }, [existing, sourceTask, taskName]);
  const [draft, setDraft] = useState(initial);

  const cleanSteps = draft.steps.filter((step) => step.name.trim());
  const canSave = !!draft.name.trim() && cleanSteps.length > 0;
  const save = async () => {
    if (!canSave) return;
    if (draft.schedule.time) await requestPlanningNotificationPermission();
    const cleanDraft = { ...draft, steps: cleanSteps };
    const savedId = existing
      ? (updateRoutine(existing.id, cleanDraft), existing.id)
      : createRoutine(cleanDraft);
    if (!savedId) return;
    if (sourceTask) deleteTask(sourceTask.id);
    successHaptic();
    router.back();
  };

  const updateStep = (id: string, patch: Partial<RoutineStep>) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === id ? { ...step, ...patch } : step,
      ),
    }));
  };

  const moveStep = (index: number, amount: number) => {
    const destination = index + amount;
    if (destination < 0 || destination >= draft.steps.length) return;
    setDraft((current) => {
      const steps = [...current.steps];
      const [step] = steps.splice(index, 1);
      steps.splice(destination, 0, step);
      return { ...current, steps };
    });
  };

  return (
    <NativeSheetScreen>
      <Stack.Screen
        options={{ title: existing ? 'Edit Routine' : 'New Routine' }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()} separateBackground>
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button disabled={!canSave} onPress={save} separateBackground>
          {existing ? 'Save' : 'Add'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <NativeSheetScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
      >
        <Field
          label="Routine name"
          onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
          pill
          placeholder="Morning routine"
          value={draft.name}
        />

        <View>
          <SectionHeader>Icon</SectionHeader>
          <View style={styles.iconGrid}>
            {trackerIconNames.map((icon) => (
              <Pressable
                accessibilityLabel={`${icon} routine icon`}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.icon === icon }}
                key={icon}
                onPress={() =>
                  setDraft((current) => ({ ...current, icon }))
                }
                style={({ pressed }) => [
                  styles.iconChoice,
                  {
                    backgroundColor:
                      draft.icon === icon
                        ? theme.colors.accentSoft
                        : theme.colors.groupedSurface,
                    borderColor:
                      draft.icon === icon
                        ? theme.colors.text
                        : theme.colors.border,
                    opacity: pressed ? 0.58 : 1,
                  },
                ]}
              >
                <TrackerIcon
                  color={theme.colors.text}
                  name={icon as TrackerIconName}
                  size={24}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <SectionHeader>Color</SectionHeader>
          <View style={styles.colors}>
            {habitColors.map((option) => {
              const selected = draft.color === option.value;
              const swatch = resolveHabitColor(option.value, theme.dark);
              return (
                <Pressable
                  accessibilityLabel={`${option.label} routine color`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      color: option.value,
                    }))
                  }
                  style={[
                    styles.color,
                    {
                      backgroundColor: swatch,
                      borderColor: selected ? theme.colors.text : 'transparent',
                    },
                  ]}
                >
                  {selected ? (
                    <Icon
                      color={contrastingInk(swatch)}
                      icon={Tick02Icon}
                      size={20}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScheduleEditor
          onChange={(schedule) =>
            setDraft((current) => ({ ...current, schedule }))
          }
          schedule={draft.schedule}
        />

        <View>
          <SectionHeader>Steps</SectionHeader>
          <View style={styles.steps}>
            {draft.steps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.step,
                  {
                    backgroundColor: theme.colors.groupedSurface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Field
                  label={`Step ${index + 1}`}
                  onChangeText={(name) => updateStep(step.id, { name })}
                  placeholder="Brush teeth"
                  value={step.name}
                />
                <View style={styles.orderControls}>
                  <SmallTextButton
                    disabled={index === 0}
                    label="↑"
                    onPress={() => moveStep(index, -1)}
                  />
                  <SmallTextButton
                    disabled={index === draft.steps.length - 1}
                    label="↓"
                    onPress={() => moveStep(index, 1)}
                  />
                  <SmallTextButton
                    label="×"
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.filter(
                          (candidate) => candidate.id !== step.id,
                        ),
                      }))
                    }
                  />
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityLabel="Add routine step"
            accessibilityRole="button"
            onPress={() => {
              tapHaptic();
              setDraft((current) => ({
                ...current,
                steps: [
                  ...current.steps,
                  { id: stepId(), name: '' },
                ],
              }));
            }}
            style={({ pressed }) => [
              styles.addStep,
              {
                backgroundColor: theme.colors.accentSoft,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Icon color={theme.colors.text} icon={Add01Icon} size={20} />
            <Text style={[typography.headline, { color: theme.colors.text }]}>Add Step</Text>
          </Pressable>
        </View>

        {existing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Delete routine?', existing.name, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteRoutine(existing.id);
                    router.back();
                  },
                },
              ])
            }
            style={({ pressed }) => [
              styles.delete,
              {
                backgroundColor: theme.colors.dangerSoft,
                opacity: pressed ? 0.58 : 1,
              },
            ]}
          >
            <Text style={[typography.headline, { color: theme.colors.danger }]}>Delete Routine</Text>
          </Pressable>
        ) : null}
      </NativeSheetScrollView>
    </NativeSheetScreen>
  );
}

function SmallTextButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTracky();
  return (
    <Pressable
      accessibilityLabel={label === '↑' ? 'Move step up' : label === '↓' ? 'Move step down' : 'Delete step'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        {
          backgroundColor: theme.colors.surfaceMuted,
          opacity: disabled ? 0.28 : pressed ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[typography.headline, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addStep: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 52,
  },
  color: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  delete: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
  },
  form: { gap: spacing.sm, paddingTop: spacing.lg },
  iconChoice: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: 'center',
    width: '22%',
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  orderControls: { alignSelf: 'flex-end', flexDirection: 'row', gap: spacing.xs },
  smallButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  step: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  steps: { gap: spacing.sm },
});
