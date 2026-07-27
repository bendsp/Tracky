import {
  Cancel01Icon,
  MoreHorizontalIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '../src/components/Icon';
import { TrackerEditorSheet } from '../src/components/tracking/TrackerEditorSheet';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import {
  radius,
  spacing,
  type as typography,
} from '../src/design/theme';
import type { TrackedEvent } from '../src/domain/models';
import {
  eventsInTimeframe,
  localDateKey,
} from '../src/domain/tracking';
import { useTimeframeNow } from '../src/hooks/useTimeframeNow';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameLocalDay(iso: string, date: Date) {
  return localDateKey(new Date(iso)) === localDateKey(date);
}

function dayCount(events: TrackedEvent[], date: Date) {
  return events.filter((event) => sameLocalDay(event.occurredAt, date)).length;
}

function eventTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function TrackerDetailSheet() {
  const { trackerId } = useLocalSearchParams<{ trackerId?: string }>();
  const router = useRouter();
  useTimeframeNow();
  const now = new Date();
  const { events, theme, toggleTrackerCheckIn, trackers } = useTracky();
  const [editorOpen, setEditorOpen] = useState(false);
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
      <View style={[styles.missing, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <HeaderIcon
                accessibilityLabel="Close"
                icon={Cancel01Icon}
                onPress={() => router.back()}
              />
            ),
            title: 'Tracker',
          }}
        />
        <Text style={[typography.section, { color: theme.colors.text }]}>
          Tracker not found
        </Text>
      </View>
    );
  }

  const todayEvents = eventsInTimeframe(trackerEvents, 'today', now);
  const completedToday = todayEvents.length > 0;
  const daysWithEntries = new Set(
    trackerEvents.map((event) => localDateKey(new Date(event.occurredAt))),
  );
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - index);
    return date;
  });
  const consistency = lastSevenDays.filter((date) =>
    daysWithEntries.has(localDateKey(date)),
  ).length;

  const toggleCompletion = () => {
    const result = toggleTrackerCheckIn(tracker.id);
    if (result === 'completed') successHaptic();
    else if (result === 'uncompleted') tapHaptic();
  };

  return (
    <View
      collapsable={false}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderIcon
              accessibilityLabel="Close tracker details"
              icon={Cancel01Icon}
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <HeaderIcon
              accessibilityLabel={`Edit ${tracker.name}`}
              icon={MoreHorizontalIcon}
              onPress={() => {
                tapHaptic();
                setEditorOpen(true);
              }}
            />
          ),
          title: tracker.name,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: theme.colors.backgroundRaised,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={tracker.icon}
              size={25}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[typography.section, { color: theme.colors.text }]}>
              {tracker.name}
            </Text>
            <Text
              style={[typography.caption, { color: theme.colors.textSecondary }]}
            >
              {completedToday ? 'Done today' : 'Not done today'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              typography.label,
              styles.sectionTitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            CONSISTENCY
          </Text>
          <View
            style={[
              styles.consistencyRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
              {consistency} of the last 7 days
            </Text>
            <Text
              style={[typography.caption, { color: theme.colors.textSecondary }]}
            >
              with an entry
            </Text>
          </View>
        </View>

        <MonthHistory
          daysWithEntries={daysWithEntries}
          month={now}
          theme={theme}
        />

        <View style={styles.section}>
          <Text
            style={[
              typography.label,
              styles.sectionTitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            ENTRIES
          </Text>
          {trackerEvents.length ? (
            <View
              style={[
                styles.entries,
                {
                  backgroundColor: theme.colors.surface,
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
                      style={[typography.cardTitle, { color: theme.colors.text }]}
                    >
                      Checked in
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(event.occurredAt))}
                      {' · '}
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
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[typography.body, { color: theme.colors.textSecondary }]}
              >
                No entries yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={styles.footer}>
        <Pressable
          accessibilityLabel={
            completedToday
              ? `Mark ${tracker.name} not complete for today`
              : `Mark ${tracker.name} complete for today`
          }
          accessibilityRole="button"
          accessibilityState={{ selected: completedToday }}
          onPress={toggleCompletion}
          style={({ pressed }) => [
            styles.logButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          {completedToday ? (
            <Icon
              color={theme.colors.onAccent}
              icon={Tick02Icon}
              size={18}
              strokeWidth={2}
            />
          ) : null}
          <Text style={[typography.label, { color: theme.colors.onAccent }]}>
            {completedToday ? 'Completed today' : 'Mark complete'}
          </Text>
        </Pressable>
      </View>

      <TrackerEditorSheet
        onClose={() => setEditorOpen(false)}
        tracker={tracker}
        visible={editorOpen}
      />
    </View>
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
  const cells = [
    ...Array.from({ length: firstDay.getDay() }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.section}>
      <Text
        style={[
          typography.label,
          styles.sectionTitle,
          { color: theme.colors.textSecondary },
        ]}
      >
        {new Intl.DateTimeFormat(undefined, {
          month: 'long',
          year: 'numeric',
        })
          .format(month)
          .toLocaleUpperCase()}
      </Text>
      <View
        style={[
          styles.calendar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {weekdays.map((weekday, index) => (
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

function HeaderIcon({
  accessibilityLabel,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  icon: typeof Cancel01Icon;
  onPress: () => void;
}) {
  const { theme } = useTracky();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={styles.headerIcon}
    >
      <Icon color={theme.colors.text} icon={icon} size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    gap: spacing.xl,
    padding: spacing.md,
    paddingBottom: 128,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statusCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 92,
    padding: spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  statusCopy: { flex: 1, gap: spacing.xxs },
  section: { gap: spacing.xs },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.15,
    paddingHorizontal: spacing.xs,
  },
  consistencyRow: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  calendar: {
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
    width: 30,
  },
  entries: {
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
  },
  entryCopy: { flex: 1, gap: spacing.xxs },
  emptyEntries: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  footer: {
    bottom: spacing.md,
    left: 0,
    paddingBottom: spacing.md,
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
