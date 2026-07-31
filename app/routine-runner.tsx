import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../src/components/Icon';
import { SectionHeader } from '../src/components/Screen';
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
import { isLocalDate, localDateAtNoon } from '../src/domain/planning';
import { localDateKey } from '../src/domain/tracking';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

export default function RoutineRunnerScreen() {
  const { date, routineId } = useLocalSearchParams<{
    date?: string;
    routineId?: string;
  }>();
  const router = useRouter();
  const {
    routineProgress,
    routines,
    theme,
    toggleRoutineStep,
  } = useTracky();
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
  const current = steps.find((step) => !step.completedAt) ?? null;
  const currentIndex = current
    ? steps.findIndex((step) => step.id === current.id)
    : -1;
  const next = currentIndex >= 0 ? steps[currentIndex + 1] ?? null : null;

  if (!routine) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: true, title: 'Routine' }} />
        <Text style={[typography.title3, { color: theme.colors.text }]}>Routine not found</Text>
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
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          title: routine.name,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          accessibilityLabel={`${routine.name}, ${count} of ${steps.length} steps complete, ${dateLabel}`}
          accessibilityValue={{ max: steps.length, min: 0, now: count }}
          style={styles.hero}
        >
          <TrackerProgressRing
            color={resolveHabitColor(routine.color, theme.dark)}
            count={count}
            size={RING_SIZE.hero}
            target={Math.max(1, steps.length)}
            trackColor={theme.colors.separator}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={routine.icon}
              size={ringIconSize(RING_SIZE.hero)}
            />
          </TrackerProgressRing>
          <Text style={[typography.title2, { color: theme.colors.text }]}>{routine.name}</Text>
          <Text style={[typography.subheadline, { color: theme.colors.textSecondary }]}>
            {complete ? `Complete · ${dateLabel}` : `${count} of ${steps.length} · ${dateLabel}`}
          </Text>
        </View>

        {complete ? (
          <View
            style={[
              styles.completeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.completeIcon, { backgroundColor: theme.colors.accent }]}>
              <Icon
                color={theme.colors.onAccent}
                icon={Tick02Icon}
                size={28}
                strokeWidth={2.4}
              />
            </View>
            <Text style={[typography.title2, { color: theme.colors.text }]}>Routine complete</Text>
            <Text
              style={[
                typography.body,
                styles.centered,
                { color: theme.colors.textSecondary },
              ]}
            >
              Nothing dramatic. You finished the next thing, then the next.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.colors.accent,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text style={[typography.headline, { color: theme.colors.onAccent }]}>Done</Text>
            </Pressable>
          </View>
        ) : current ? (
          <View
            style={[
              styles.focusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[typography.footnote, { color: theme.colors.textSecondary }]}>Current step</Text>
            <Text style={[typography.title, styles.centered, { color: theme.colors.text }]}>
              {current.name}
            </Text>
            {current.durationMinutes ? (
              <Text style={[typography.body, { color: theme.colors.textSecondary }]}>About {current.durationMinutes} minutes</Text>
            ) : null}
            {next ? (
              <Text style={[typography.subheadline, { color: theme.colors.textTertiary }]}>Next: {next.name}</Text>
            ) : null}
            <Pressable
              accessibilityLabel={`Complete ${current.name}`}
              accessibilityRole="button"
              onPress={() => toggle(current.id)}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.colors.accent,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text style={[typography.headline, { color: theme.colors.onAccent }]}>Done</Text>
            </Pressable>
          </View>
        ) : null}

        <View>
          <SectionHeader>Steps</SectionHeader>
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
                      {
                        color: done
                          ? theme.colors.textSecondary
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {step.name}
                  </Text>
                  {step.durationMinutes ? (
                    <Text style={[typography.footnote, { color: theme.colors.textTertiary }]}>
                      {step.durationMinutes}m
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: 'center' },
  check: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  completeCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  completeIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  focusCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.xl,
  },
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  missing: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.sm,
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
  steps: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
