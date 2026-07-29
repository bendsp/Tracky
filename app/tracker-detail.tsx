import {
  Add01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../src/components/Icon';
import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import { SectionHeader } from '../src/components/Screen';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import {
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../src/design/theme';
import type { TrackedEvent } from '../src/domain/models';
import {
  currentGoalStreak,
  goalStreakDescription,
  goalStreakLabels,
  localDateKey,
  trackerGoalStatus,
} from '../src/domain/tracking';
import { useTimeframeNow } from '../src/hooks/useTimeframeNow';
import { useTrackerEditorSession } from '../src/store/TrackerEditorSession';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

/** Width of the completion ring, in the tracker's colour. */
const COMPLETION_RING = 3;

function eventDay(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(iso));
}

function eventTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Narrow weekday initials in the user's locale, starting Monday to match
 * `startOfGoalPeriod`. 1 January 2024 was a Monday.
 */
function weekdayInitials() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2024, 0, 1 + index)),
  );
}

export default function TrackerDetailSheet() {
  const { trackerId } = useLocalSearchParams<{ trackerId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useTimeframeNow();
  const trackerEditor = useTrackerEditorSession();
  const now = new Date();
  const { events, theme, toggleTrackerCheckIn, trackers } = useTracky();
  const tracker = trackers.find((candidate) => candidate.id === trackerId);
  const trackerEvents = useMemo(
    () =>
      events
        .filter((event) => event.trackerId === trackerId)
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        ),
    [events, trackerId],
  );

  if (!tracker) {
    return (
      <NativeSheetScreen style={styles.missing}>
        <Stack.Screen options={{ title: 'Tracker' }} />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Close"
            icon="xmark"
            onPress={() => router.back()}
            separateBackground
          />
        </Stack.Toolbar>
        <Text style={[typography.title3, { color: theme.colors.text }]}>
          Tracker not found
        </Text>
      </NativeSheetScreen>
    );
  }

  const goalStatus = trackerGoalStatus(tracker, trackerEvents, now);
  const completedGoal = goalStatus.complete;
  const daysWithEntries = new Set(
    trackerEvents.map((event) => localDateKey(new Date(event.occurredAt))),
  );
  const streak = currentGoalStreak(tracker, trackerEvents, now);
  const footerInset = Math.max(insets.bottom, spacing.md);

  const toggleCompletion = () => {
    const result = toggleTrackerCheckIn(tracker.id);
    if (result === 'completed') successHaptic();
    else if (result === 'uncompleted' || result === 'logged') tapHaptic();
  };

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: tracker.name }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close tracker details"
          icon="xmark"
          onPress={() => router.back()}
          separateBackground
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={`Edit ${tracker.name}`}
          icon="ellipsis"
          onPress={() => {
            tapHaptic();
            trackerEditor.begin(tracker);
            router.push('/tracker-editor');
          }}
          separateBackground
        />
      </Stack.Toolbar>

      <NativeSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerInset + 52 + spacing.xl },
        ]}
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: theme.colors.background,
                borderColor: completedGoal
                  ? resolveHabitColor(tracker.color, theme.dark)
                  : theme.colors.border,
                borderWidth: completedGoal
                  ? COMPLETION_RING
                  : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={tracker.icon}
              size={44}
            />
          </View>
          <Text style={[typography.title2, { color: theme.colors.text }]}>
            {tracker.name}
          </Text>
        </View>

        <View
          accessibilityLabel={`${goalStreakDescription(
            tracker.goal.period,
            streak,
          )}, ${trackerEvents.length} check-ins`}
          style={[
            styles.statsCard,
            {
              backgroundColor: theme.colors.groupedSurface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.stat}>
            <Text style={[typography.title, { color: theme.colors.text }]}>
              {streak}
            </Text>
            <Text
              style={[
                typography.footnote,
                { color: theme.colors.textSecondary },
              ]}
            >
              {goalStreakLabels[tracker.goal.period]}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: theme.colors.separator },
            ]}
          />
          <View style={styles.stat}>
            <Text style={[typography.title, { color: theme.colors.text }]}>
              {trackerEvents.length}
            </Text>
            <Text
              style={[
                typography.footnote,
                { color: theme.colors.textSecondary },
              ]}
            >
              Check-ins
            </Text>
          </View>
        </View>

        <MonthHistory
          daysWithEntries={daysWithEntries}
          month={now}
          theme={theme}
        />

        <View>
          <SectionHeader>Entries</SectionHeader>
          {trackerEvents.length ? (
            <View
              style={[
                styles.entries,
                {
                  backgroundColor: theme.colors.groupedSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {trackerEvents.slice(0, 20).map((event, index) => (
                <View
                  key={event.id}
                  style={[
                    styles.entry,
                    index > 0 && {
                      borderTopColor: theme.colors.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.entryCopy}>
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.headline,
                        { color: theme.colors.text },
                      ]}
                    >
                      {eventDay(event.occurredAt)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.subheadline,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {eventTime(event.occurredAt)}
                      {event.note ? ` · ${event.note}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyEntries,
                {
                  backgroundColor: theme.colors.groupedSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  typography.subheadline,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No entries yet.
              </Text>
            </View>
          )}
        </View>
      </NativeSheetScrollView>

      <View
        pointerEvents="box-none"
        style={[styles.footer, { paddingBottom: footerInset }]}
      >
        <Pressable
          accessibilityLabel={
            completedGoal
              ? `Undo the latest ${tracker.name} check-in`
              : `Check in ${tracker.name}, ${goalStatus.detail}`
          }
          accessibilityRole="button"
          accessibilityState={{ selected: completedGoal }}
          onPress={toggleCompletion}
          style={({ pressed }) => [
            styles.logButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Icon
            color={theme.colors.onAccent}
            icon={completedGoal ? Tick02Icon : Add01Icon}
            size={20}
            strokeWidth={2}
          />
          <Text style={[typography.headline, { color: theme.colors.onAccent }]}>
            {completedGoal ? 'Undo check-in' : 'Check in'}
          </Text>
        </Pressable>
      </View>
    </NativeSheetScreen>
  );
}

function MonthHistory({
  daysWithEntries,
  month,
  theme,
}: {
  daysWithEntries: Set<string>;
  month: Date;
  theme: ReturnType<typeof useTracky>['theme'];
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first, matching how goal periods are bucketed.
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <View>
      <SectionHeader>
        {new Intl.DateTimeFormat(undefined, {
          month: 'long',
          year: 'numeric',
        }).format(month)}
      </SectionHeader>
      <View
        style={[
          styles.calendar,
          {
            backgroundColor: theme.colors.groupedSurface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {weekdayInitials().map((weekday, index) => (
          <Text
            key={`${weekday}-${index}`}
            style={[
              typography.caption,
              styles.calendarCell,
              { color: theme.colors.textTertiary },
            ]}
          >
            {weekday}
          </Text>
        ))}
        {cells.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.calendarCell} />;
          }
          const date = new Date(year, monthIndex, day, 12);
          const active = daysWithEntries.has(localDateKey(date));
          return (
            <View key={day} style={styles.calendarCell}>
              <View
                style={[
                  styles.day,
                  active && { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: active
                        ? theme.colors.onAccent
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 116,
    justifyContent: 'center',
    width: 116,
  },
  statsCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 100,
    paddingVertical: spacing.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  statDivider: {
    height: 44,
    width: StyleSheet.hairlineWidth,
  },
  calendar: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  calendarCell: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    textAlign: 'center',
    width: '14.2857%',
  },
  day: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: spacing.xxs,
  },
  entries: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  entry: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    paddingVertical: spacing.sm,
  },
  entryCopy: { flex: 1, gap: spacing.xxs },
  emptyEntries: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  footer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  logButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  missing: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
