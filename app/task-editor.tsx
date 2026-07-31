import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '../src/components/Form';
import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import {
  NativeActionMenu,
  NativeDatePicker,
  type NativeMenuAction,
} from '../src/components/NativeControls';
import { OptionalTimeEditor } from '../src/components/planning/OptionalTimeEditor';
import { SectionHeader } from '../src/components/Screen';
import {
  radius,
  spacing,
  type as typography,
} from '../src/design/theme';
import type { TaskDraft } from '../src/domain/models';
import {
  isLocalDate,
  localDateAtNoon,
} from '../src/domain/planning';
import { newTrackerDraft } from '../src/domain/trackerDraft';
import { localDateKey } from '../src/domain/tracking';
import { requestPlanningNotificationPermission } from '../src/notifications/PlanningNotificationRuntime';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

export default function TaskEditorScreen() {
  const { date, taskId } = useLocalSearchParams<{
    date?: string;
    taskId?: string;
  }>();
  const router = useRouter();
  const {
    createTask,
    createTracker,
    deleteTask,
    routines,
    tasks,
    theme,
    updateRoutine,
    updateTask,
  } = useTracky();
  const existing = tasks.find((task) => task.id === taskId) ?? null;
  const initial = useMemo<TaskDraft>(
    () =>
      existing
        ? {
            name: existing.name,
            scheduledDate: existing.scheduledDate,
            time: existing.time,
          }
        : {
            name: '',
            scheduledDate: isLocalDate(date) ? date : localDateKey(new Date()),
            time: null,
          },
    [date, existing],
  );
  const [draft, setDraft] = useState(initial);
  const cleanName = draft.name.trim();

  const save = async () => {
    if (!draft.name.trim()) return;
    if (draft.time) await requestPlanningNotificationPermission();
    if (existing) updateTask(existing.id, draft);
    else createTask(draft);
    successHaptic();
    router.back();
  };

  const convertToTracker = () => {
    if (!cleanName) return;
    Alert.alert(
      'Make this a habit?',
      'This task will become a daily habit. You can adjust its goal and schedule afterward.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make a habit',
          onPress: () => {
            const trackerDraft = newTrackerDraft();
            const trackerId = createTracker({
              ...trackerDraft,
              name: cleanName,
              goal: {
                ...trackerDraft.goal,
                startDate: draft.scheduledDate,
              },
              schedule: {
                ...trackerDraft.schedule,
                startDate: draft.scheduledDate,
                time: draft.time,
              },
            });
            if (!trackerId) return;
            if (existing) deleteTask(existing.id);
            successHaptic();
            router.replace({
              pathname: '/tracker-detail',
              params: { trackerId },
            });
          },
        },
      ],
    );
  };

  const routineActions = useMemo<NativeMenuAction[]>(
    () => [
      ...routines.map((routine) => ({
        id: `routine:${routine.id}`,
        label: routine.name,
        systemImage: 'text.append' as const,
        onPress: () => {
          updateRoutine(routine.id, {
            name: routine.name,
            icon: routine.icon,
            color: routine.color,
            schedule: routine.schedule,
            steps: [
              ...routine.steps,
              {
                id: `routine_step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: cleanName,
              },
            ],
          });
          if (existing) deleteTask(existing.id);
          successHaptic();
          router.back();
        },
      })),
      {
        id: 'new-routine',
        label: 'New Routine…',
        systemImage: 'plus',
        onPress: () =>
          router.push({
            pathname: '/routine-editor',
            params: existing
              ? { taskId: existing.id, taskName: cleanName }
              : { taskName: cleanName },
          }),
      },
    ],
    [
      cleanName,
      deleteTask,
      existing,
      router,
      routines,
      updateRoutine,
    ],
  );

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: existing ? 'Edit Task' : 'New Task' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()} separateBackground>
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          disabled={!draft.name.trim()}
          onPress={save}
          separateBackground
        >
          {existing ? 'Save' : 'Add'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <NativeSheetScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
      >
        <Field
          label="Task"
          onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
          onSubmitEditing={save}
          pill
          placeholder="Pack lunch"
          returnKeyType="done"
          value={draft.name}
        />

        <View>
          <SectionHeader>Date</SectionHeader>
          <View
            style={[
              styles.controlCard,
              {
                backgroundColor: theme.colors.groupedSurface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[typography.body, { color: theme.colors.text }]}>Scheduled</Text>
            <NativeDatePicker
              compact
              label="Task date"
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  scheduledDate: localDateKey(value),
                }))
              }
              value={localDateAtNoon(draft.scheduledDate)}
            />
          </View>
        </View>

        <OptionalTimeEditor
          onChange={(time) =>
            setDraft((current) => ({ ...current, time }))
          }
          time={draft.time}
        />

        <View>
          <SectionHeader>Turn this into more</SectionHeader>
          <View
            style={[
              styles.actionCard,
              {
                backgroundColor: theme.colors.groupedSurface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ActionRow
              disabled={!cleanName}
              label="Make a habit"
              onPress={convertToTracker}
              theme={theme}
            />
            <View
              style={[
                styles.actionRow,
                {
                  borderTopColor: theme.colors.separator,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  opacity: cleanName ? 1 : 0.34,
                },
              ]}
            >
              <Text style={[typography.body, { color: theme.colors.text }]}>
                Move into a routine
              </Text>
              {cleanName ? (
                <NativeActionMenu
                  accessibilityLabel="Choose a routine for this task"
                  actions={routineActions}
                  label={routines.length ? 'Choose' : 'New Routine…'}
                />
              ) : null}
            </View>
          </View>
        </View>

        {existing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tapHaptic();
              Alert.alert('Delete task?', existing.name, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteTask(existing.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={({ pressed }) => [
              styles.delete,
              {
                backgroundColor: theme.colors.dangerSoft,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[typography.headline, { color: theme.colors.danger }]}>Delete Task</Text>
          </Pressable>
        ) : null}
      </NativeSheetScrollView>
    </NativeSheetScreen>
  );
}

function ActionRow({
  divided = false,
  disabled = false,
  label,
  onPress,
  theme,
}: {
  divided?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTracky>['theme'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        divided && {
          borderTopColor: theme.colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        { opacity: disabled ? 0.34 : pressed ? 0.58 : 1 },
      ]}
    >
      <Text style={[typography.body, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[typography.headline, { color: theme.colors.textTertiary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  controlCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  delete: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
  },
  form: { gap: spacing.sm, paddingTop: spacing.lg },
});
