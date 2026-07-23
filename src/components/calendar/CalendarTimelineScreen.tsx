import {
  Activity01Icon,
  Calendar03Icon,
  NoteEditIcon,
} from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '../EmptyState';
import { PrimaryButton } from '../Form';
import { useMinimizeOnScroll } from '../glass-tabs';
import { Icon } from '../Icon';
import { NativeTimePicker } from '../NativeControls';
import { ScreenHeader, SectionTitle } from '../Screen';
import { Sheet } from '../Sheet';
import { useCalendarSelection } from './CalendarSelectionProvider';
import {
  colorWithAlpha,
  radius,
  spacing,
  type as typography,
} from '../../design/theme';
import {
  useTracky,
  type ActivityBlock,
  type TrackedEvent,
} from '../../store/TrackyProvider';

export type CalendarControlProps = {
  activities: ActivityBlock[];
  events: TrackedEvent[];
  now: Date;
  onEditActivity: (activity: ActivityBlock) => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
};

type CalendarTimelineScreenProps = {
  renderCalendar: (props: CalendarControlProps) => ReactNode;
  title: string;
};

type TimelineItem =
  | { kind: 'activity'; at: string; activity: ActivityBlock }
  | { kind: 'event'; at: string; event: TrackedEvent };

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function overlapsDay(activity: ActivityBlock, date: Date, now: Date) {
  const { start, end } = dayBounds(date);
  const activityStart = new Date(activity.startedAt);
  const activityEnd = activity.endedAt ? new Date(activity.endedAt) : now;
  return activityStart < end && activityEnd > start;
}

function sameDay(iso: string, date: Date) {
  const { start, end } = dayBounds(date);
  const value = new Date(iso);
  return value >= start && value < end;
}

function isRenderableActivity(activity: ActivityBlock, now: Date) {
  const start = new Date(activity.startedAt);
  const end = activity.endedAt ? new Date(activity.endedAt) : now;
  return (
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start
  );
}

function isRenderableEvent(event: TrackedEvent) {
  return Number.isFinite(new Date(event.occurredAt).getTime());
}

function time(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function duration(startedAt: string, endedAt: string | null, now: Date) {
  const end = endedAt ? new Date(endedAt).getTime() : now.getTime();
  const minutes = Math.max(
    0,
    Math.round((end - new Date(startedAt).getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function dayTitle(date: Date, now: Date) {
  const dayOrdinal = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
  const dayDelta = dayOrdinal(date) - dayOrdinal(now);
  if (dayDelta === 0) return 'Today';
  if (dayDelta === -1) return 'Yesterday';
  if (dayDelta === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function CalendarTimelineScreen({
  renderCalendar,
  title,
}: CalendarTimelineScreenProps) {
  const {
    activities,
    currentActivity,
    events,
    theme,
    updateActivityTimes,
  } = useTracky();
  const { selectedDate, setSelectedDate } = useCalendarSelection();
  const onScroll = useMinimizeOnScroll();
  const [now, setNow] = useState(() => new Date());
  const [editingActivity, setEditingActivity] = useState<ActivityBlock | null>(
    null,
  );
  const [startValue, setStartValue] = useState<Date | null>(null);
  const [endValue, setEndValue] = useState<Date | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [currentActivity?.id]);

  const validActivities = useMemo(
    () => activities.filter((activity) => isRenderableActivity(activity, now)),
    [activities, now],
  );
  const validEvents = useMemo(
    () => events.filter(isRenderableEvent),
    [events],
  );
  const validCurrentActivity =
    currentActivity &&
    validActivities.find((activity) => activity.id === currentActivity.id);
  const isToday = selectedDate.toDateString() === now.toDateString();
  const dayActivities = validActivities.filter((item) =>
    overlapsDay(item, selectedDate, now),
  );
  const dayEvents = validEvents.filter((item) =>
    sameDay(item.occurredAt, selectedDate),
  );

  const timeline = useMemo<TimelineItem[]>(
    () =>
      [
        ...dayActivities.map(
          (activity): TimelineItem => ({
            kind: 'activity',
            at: activity.startedAt,
            activity,
          }),
        ),
        ...dayEvents.map(
          (event): TimelineItem => ({
            kind: 'event',
            at: event.occurredAt,
            event,
          }),
        ),
      ].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
    [dayActivities, dayEvents],
  );

  const openActivityEditor = (activity: ActivityBlock) => {
    setEditingActivity(activity);
    setStartValue(new Date(activity.startedAt));
    setEndValue(activity.endedAt ? new Date(activity.endedAt) : null);
    setTimeError(null);
  };

  const submitActivityTimes = () => {
    if (!editingActivity || !startValue) return;
    if (!Number.isFinite(startValue.getTime())) {
      setTimeError('Choose a valid start time.');
      return;
    }
    if (editingActivity.endedAt && !endValue) {
      setTimeError('Ended activities need an end time.');
      return;
    }
    if (endValue && endValue <= startValue) {
      setTimeError('End time must be after start time.');
      return;
    }
    if (!editingActivity.endedAt && endValue) {
      setTimeError('The current activity stays open until you switch or stop it.');
      return;
    }
    if (!updateActivityTimes(editingActivity.id, startValue, endValue)) {
      setTimeError('These times overlap another activity or cannot be saved.');
      return;
    }
    setEditingActivity(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={title} />

        <View style={styles.inner}>
          <View style={styles.calendarSlot}>
            {renderCalendar({
              activities: validActivities,
              events: validEvents,
              now,
              onEditActivity: openActivityEditor,
              onSelectDate: setSelectedDate,
              selectedDate,
            })}
          </View>

          {isToday && validCurrentActivity ? (
            <View
              style={[
                styles.currentCard,
                {
                  backgroundColor: colorWithAlpha(validCurrentActivity.color, 0.06),
                  borderColor: colorWithAlpha(validCurrentActivity.color, 0.28),
                },
              ]}
            >
              <View style={styles.currentIdentity}>
                <View
                  style={[
                    styles.nowDot,
                    { backgroundColor: validCurrentActivity.color },
                  ]}
                />
                <View style={styles.currentCopy}>
                  <View style={styles.currentTitleRow}>
                    <Text
                      style={[
                        typography.eyebrow,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      NOW
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.currentName, { color: theme.colors.text }]}
                    >
                      {validCurrentActivity.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    since {time(validCurrentActivity.startedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.currentDuration}>
                <Text
                  style={[
                    styles.currentDurationValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {duration(validCurrentActivity.startedAt, null, now)}
                </Text>
              </View>
            </View>
          ) : isToday ? (
            <View
              style={[
                styles.idleCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[styles.idleIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon color={theme.colors.accent} icon={Activity01Icon} size={24} />
              </View>
              <Text
                style={[
                  typography.cardTitle,
                  styles.idleCopy,
                  { color: theme.colors.text },
                ]}
              >
                No activity running
              </Text>
            </View>
          ) : null}

          <SectionTitle
            meta={
              timeline.length
                ? `${dayActivities.length} ${
                    dayActivities.length === 1 ? 'activity' : 'activities'
                  } · ${dayEvents.length} ${
                    dayEvents.length === 1 ? 'event' : 'events'
                  }`
                : undefined
            }
          >
            {dayTitle(selectedDate, now)}
          </SectionTitle>

          {timeline.length ? (
            <View style={styles.timeline}>
              {timeline.map((item) =>
                item.kind === 'activity' ? (
                  <ActivityRow
                    activity={item.activity}
                    key={item.activity.id}
                    now={now}
                    onEdit={() => openActivityEditor(item.activity)}
                    selectedDate={selectedDate}
                  />
                ) : (
                  <EventRow event={item.event} key={item.event.id} />
                ),
              )}
            </View>
          ) : (
            <EmptyState icon={Calendar03Icon} title="Nothing recorded" />
          )}
        </View>
      </Animated.ScrollView>

      <Sheet
        onClose={() => setEditingActivity(null)}
        title={editingActivity ? `Edit ${editingActivity.name}` : 'Edit activity'}
        visible={!!editingActivity}
      >
        {startValue ? (
          <NativeTimePicker
            label="Start"
            onChange={(value) => {
              setStartValue(value);
              setTimeError(null);
            }}
            value={startValue}
          />
        ) : null}
        {endValue ? (
          <NativeTimePicker
            label="End"
            onChange={(value) => {
              setEndValue(value);
              setTimeError(null);
            }}
            value={endValue}
          />
        ) : (
          <View
            style={[
              styles.currentEnd,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[typography.body, { color: theme.colors.text }]}>
              End
            </Text>
            <Text
              style={[typography.body, { color: theme.colors.textSecondary }]}
            >
              When you switch or stop
            </Text>
          </View>
        )}
        {timeError ? (
          <Text
            accessibilityRole="alert"
            style={[typography.caption, { color: theme.colors.danger }]}
          >
            {timeError}
          </Text>
        ) : null}
        <PrimaryButton label="Save times" onPress={submitActivityTimes} />
      </Sheet>
    </View>
  );
}

function ActivityRow({
  activity,
  now,
  onEdit,
  selectedDate,
}: {
  activity: ActivityBlock;
  now: Date;
  onEdit: () => void;
  selectedDate: Date;
}) {
  const { theme } = useTracky();
  const { start: dayStart, end: dayEnd } = dayBounds(selectedDate);
  const visibleStart = new Date(
    Math.max(new Date(activity.startedAt).getTime(), dayStart.getTime()),
  );
  const actualEnd = activity.endedAt ? new Date(activity.endedAt) : now;
  const visibleEnd = new Date(Math.min(actualEnd.getTime(), dayEnd.getTime()));
  return (
    <View style={styles.timelineRow}>
      <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>
        {time(visibleStart.toISOString())}
      </Text>
      <View style={styles.rail}>
        <View
          style={[
            styles.railDot,
            {
              backgroundColor: activity.color,
              borderColor: theme.colors.background,
            },
          ]}
        />
        <View style={[styles.railLine, { backgroundColor: theme.colors.border }]} />
      </View>
      <Pressable
        accessibilityHint="Opens start and end time editing"
        accessibilityLabel={`Edit ${activity.name}`}
        accessibilityRole="button"
        onPress={onEdit}
        style={[
          styles.timelineCard,
          {
            backgroundColor: activity.endedAt
              ? theme.colors.surface
              : colorWithAlpha(activity.color, 0.08),
            borderColor: activity.endedAt
              ? theme.colors.border
              : colorWithAlpha(activity.color, 0.38),
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
            {activity.name}
          </Text>
          <Text
            style={[typography.caption, { color: theme.colors.textSecondary }]}
          >
            {duration(
              visibleStart.toISOString(),
              visibleEnd.toISOString(),
              visibleEnd,
            )}
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
          {time(visibleStart.toISOString())} –{' '}
          {!activity.endedAt && visibleEnd.getTime() === now.getTime()
            ? 'Now'
            : time(visibleEnd.toISOString())}
        </Text>
      </Pressable>
    </View>
  );
}

function EventRow({ event }: { event: TrackedEvent }) {
  const { theme, trackers } = useTracky();
  const tracker = trackers.find((item) => item.id === event.trackerId);
  if (!tracker) return null;
  const detail = [
    event.numericValue !== null
      ? `${event.numericValue}${event.unit ? ` ${event.unit}` : ''}`
      : null,
    event.note,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.timelineRow}>
      <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>
        {time(event.occurredAt)}
      </Text>
      <View style={styles.rail}>
        <View
          style={[
            styles.eventDot,
            {
              backgroundColor: theme.colors.accentSoft,
              borderColor: theme.colors.accent,
            },
          ]}
        >
          <Icon color={theme.colors.accent} icon={NoteEditIcon} size={12} />
        </View>
        <View style={[styles.railLine, { backgroundColor: theme.colors.border }]} />
      </View>
      <View style={[styles.eventCard, { borderBottomColor: theme.colors.separator }]}>
        <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
          {tracker.name}
        </Text>
        {detail ? (
          <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 148 },
  inner: { paddingHorizontal: spacing.lg },
  calendarSlot: { marginBottom: spacing.lg },
  currentCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nowDot: { borderRadius: 4, height: 8, width: 8 },
  currentCopy: { flex: 1, gap: 1 },
  currentTitleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  currentName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  currentDuration: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  currentDurationValue: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  idleCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  idleIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  idleCopy: { flex: 1 },
  currentEnd: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', minHeight: 88 },
  timelineTime: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    paddingTop: 5,
    width: 44,
  },
  rail: { alignItems: 'center', width: 28 },
  railDot: {
    borderRadius: 7,
    borderWidth: 3,
    height: 14,
    marginTop: 5,
    width: 14,
    zIndex: 1,
  },
  eventDot: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
    zIndex: 1,
  },
  railLine: { flex: 1, width: 1 },
  timelineCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  eventCard: {
    borderBottomWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
