import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../src/components/Icon';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import {
  RING_SIZE,
  ringIconSize,
} from '../src/components/tracking/progressRing';
import { TrackerProgressRing } from '../src/components/tracking/TrackerProgressRing';
import {
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../src/design/theme';
import {
  isLocalDate,
  localDateAtNoon,
  routineStepMinutes,
} from '../src/domain/planning';
import { localDateKey } from '../src/domain/tracking';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

export default function RoutineRunnerScreen() {
  const { date, routineId } = useLocalSearchParams<{
    date?: string;
    routineId?: string;
  }>();
  const router = useRouter();
  const { routineProgress, routines, theme, toggleRoutineStep } = useTracky();
  const [showSteps, setShowSteps] = useState(false);
  const forDate = isLocalDate(date) ? date : localDateKey(new Date());
  const routine = routines.find((candidate) => candidate.id === routineId);
  const progress = routineProgress.find(
    (candidate) =>
      candidate.routineId === routineId && candidate.forDate === forDate,
  );
  const steps = useMemo(
    () =>
      progress?.steps ??
      routine?.steps.map((step) => ({ ...step, completedAt: null })) ??
      [],
    [progress, routine],
  );
  const count = steps.filter((step) => step.completedAt).length;
  const complete = steps.length > 0 && count === steps.length;
  const currentIndex = steps.findIndex((step) => !step.completedAt);
  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  const next = currentIndex >= 0 ? (steps[currentIndex + 1] ?? null) : null;
  const remainingMinutes = routineStepMinutes(
    steps.filter((step) => !step.completedAt),
  );

  const close = () => {
    tapHaptic();
    router.back();
  };

  if (!routine) {
    return (
      <View
        style={[styles.missing, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen
          options={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { color: theme.colors.text },
            title: 'Routine',
          }}
        />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Leave this routine"
            icon="xmark"
            onPress={close}
          />
        </Stack.Toolbar>
        <Text style={[typography.title3, { color: theme.colors.text }]}>
          Routine not found
        </Text>
      </View>
    );
  }

  const toggle = (stepId: string) => {
    const result = toggleRoutineStep(routine.id, forDate, stepId);
    if (result === 'completed') successHaptic();
    else if (result) tapHaptic();
  };

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(localDateAtNoon(forDate));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          title: routine.name,
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Leave this routine"
          icon="xmark"
          onPress={close}
        />
      </Stack.Toolbar>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          accessibilityLabel={`${routine.name}, ${count} of ${steps.length} steps complete, ${dateLabel}`}
          accessibilityValue={{ max: steps.length, min: 0, now: count }}
          style={styles.meta}
        >
          <TrackerProgressRing
            color={resolveHabitColor(routine.color, theme.dark)}
            count={count}
            size={RING_SIZE.day}
            target={Math.max(1, steps.length)}
            trackColor={theme.colors.separator}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={routine.icon}
              size={ringIconSize(RING_SIZE.day)}
            />
          </TrackerProgressRing>
          <View style={styles.metaCopy}>
            <Text style={[typography.headline, { color: theme.colors.text }]}>
              {complete
                ? 'All done'
                : `Step ${currentIndex + 1} of ${steps.length}`}
            </Text>
            <Text
              style={[
                typography.footnote,
                { color: theme.colors.textSecondary },
              ]}
            >
              {complete
                ? dateLabel
                : remainingMinutes
                  ? `About ${remainingMinutes} min left`
                  : dateLabel}
            </Text>
          </View>
        </View>

        {/*
          The point of a routine is not having to hold the list in your head,
          so the current step is the screen and everything else is subordinate
          to it. The full list stays one tap away rather than on display.
        */}
        <View style={styles.focus}>
          {complete ? (
            <>
              <View
                style={[
                  styles.completeIcon,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Icon
                  color={theme.colors.onAccent}
                  icon={Tick02Icon}
                  size={30}
                  strokeWidth={2.4}
                />
              </View>
              <Text
                style={[
                  typography.title,
                  styles.centered,
                  { color: theme.colors.text },
                ]}
              >
                Routine complete
              </Text>
              <Text
                style={[
                  typography.body,
                  styles.centered,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Nothing dramatic. You finished the next thing, then the next.
              </Text>
            </>
          ) : current ? (
            <>
              <Text
                style={[
                  typography.title,
                  styles.centered,
                  { color: theme.colors.text },
                ]}
              >
                {current.name}
              </Text>
              {current.durationMinutes ? (
                <Text
                  style={[
                    typography.body,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  About {current.durationMinutes} minutes
                </Text>
              ) : null}
            </>
          ) : (
            <Text
              style={[
                typography.body,
                styles.centered,
                { color: theme.colors.textSecondary },
              ]}
            >
              This routine has no steps yet.
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {next && !complete ? (
            <Text
              style={[
                typography.footnote,
                styles.centered,
                { color: theme.colors.textTertiary },
              ]}
            >
              Then: {next.name}
            </Text>
          ) : null}

          {complete || current ? (
            <Pressable
              accessibilityLabel={
                complete ? 'Leave this routine' : `Complete ${current?.name}`
              }
              accessibilityRole="button"
              onPress={() => (complete ? close() : toggle(current!.id))}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.colors.accent,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[typography.headline, { color: theme.colors.onAccent }]}
              >
                {complete ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          ) : null}

          {steps.length ? (
            <Pressable
              accessibilityLabel="All steps"
              accessibilityRole="button"
              accessibilityState={{ expanded: showSteps }}
              onPress={() => {
                tapHaptic();
                setShowSteps((value) => !value);
              }}
              style={({ pressed }) => [
                styles.disclosure,
                { opacity: pressed ? 0.55 : 1 },
              ]}
            >
              <Text
                style={[
                  typography.subheadline,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {showSteps ? 'Hide all steps' : `All ${steps.length} steps`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {showSteps ? (
          <View
            style={[
              styles.steps,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {steps.map((step, index) => {
              const done = !!step.completedAt;
              return (
                <Pressable
                  accessibilityLabel={`${done ? 'Mark incomplete' : 'Complete'} ${step.name}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  key={step.id}
                  onPress={() => toggle(step.id)}
                  style={({ pressed }) => [
                    styles.step,
                    index > 0 && {
                      borderTopColor: theme.colors.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                    { opacity: pressed ? 0.58 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: done
                          ? theme.colors.accent
                          : 'transparent',
                        borderColor: done
                          ? theme.colors.accent
                          : theme.colors.separator,
                      },
                    ]}
                  >
                    {done ? (
                      <Icon
                        color={theme.colors.onAccent}
                        icon={Tick02Icon}
                        size={18}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      typography.body,
                      styles.stepName,
                      {
                        color:
                          index === currentIndex
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {step.name}
                  </Text>
                  {step.durationMinutes ? (
                    <Text
                      style={[
                        typography.footnote,
                        { color: theme.colors.textTertiary },
                      ]}
                    >
                      {step.durationMinutes}m
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  centered: { textAlign: 'center' },
  check: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  completeIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 56,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  disclosure: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  focus: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  meta: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  metaCopy: { flex: 1, gap: spacing.xxs },
  missing: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
  },
  screen: { flex: 1 },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
  },
  stepName: { flex: 1 },
  steps: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
