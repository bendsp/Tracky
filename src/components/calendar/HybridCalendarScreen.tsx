import {
  CalendarBody,
  CalendarContainer,
  type CalendarKitHandle,
  type EventItem,
  type OnEventResponse,
  type PackedEvent,
} from '@howljs/calendar-kit';
import { BlurView } from 'expo-blur';
import { useIsFocused } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildCalendarDay } from '../../domain/calendar';
import type { ActivityBlock, HexColor } from '../../domain/models';
import {
  colorWithAlpha,
  radius,
  spacing,
} from '../../design/theme';
import { useTracky } from '../../store/TrackyProvider';
import { ActivityEditorSheet } from './ActivityEditorSheet';
import { useCalendarSelection } from './CalendarSelectionProvider';
import {
  fromCalendarDate,
  toLocalDateId,
} from './dateUtils';
import { WixCalendarControl } from './WixCalendarControl';

const TAB_BAR_CLEARANCE = 150;

type ActivityTimelineEvent = EventItem & {
  trackyKind: 'activity';
  sourceId: string;
  zoneColor: HexColor;
  zoneTitle: string;
  durationLabel: string;
  isRunning: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  markers: {
    id: string;
    label: string;
    offsetPercentage: number;
  }[];
};

type MarkerTimelineEvent = EventItem & {
  trackyKind: 'marker';
  sourceId: string;
  markerTitle: string;
  markerDetail: string | null;
};

type TrackyTimelineEvent = ActivityTimelineEvent | MarkerTimelineEvent;

function formatDuration(startsAt: Date, endsAt: Date) {
  const minutes = Math.max(
    1,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function HybridCalendarScreen() {
  const isFocused = useIsFocused();
  const {
    activities,
    currentActivity,
    events,
    theme,
    trackers,
  } = useTracky();
  const { selectedDate, setSelectedDate } = useCalendarSelection();
  const insets = useSafeAreaInsets();
  const calendarRef = useRef<CalendarKitHandle>(null);
  const lastFocusedDateRef = useRef<number | null>(null);
  const visibleDateIdRef = useRef(toLocalDateId(selectedDate));
  const [now, setNow] = useState(() => new Date());
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [controlHeight, setControlHeight] = useState(0);
  const [editingActivity, setEditingActivity] = useState<ActivityBlock | null>(
    null,
  );
  const controlTop = insets.top + spacing.xs;
  const timelineTopInset =
    controlHeight > 0
      ? controlTop + controlHeight + spacing.sm
      : insets.top;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [currentActivity?.id]);

  useEffect(() => {
    if (isFocused) return;
    setCalendarLoaded(false);
    lastFocusedDateRef.current = null;
  }, [isFocused]);

  const day = useMemo(
    () =>
      buildCalendarDay({
        activities,
        date: selectedDate,
        events,
        now,
        trackers,
      }),
    [activities, events, now, selectedDate, trackers],
  );

  const timelineEvents = useMemo<TrackyTimelineEvent[]>(
    () => {
      const markersByZoneId = new Map<
        string,
        ActivityTimelineEvent['markers']
      >();
      const embeddedMarkerIds = new Set<string>();
      for (const marker of day.eventMarkers) {
        const containingZone = day.activityZones.find(
          (candidate) =>
            marker.occursAt >= candidate.startsAt &&
            marker.occursAt < candidate.endsAt,
        );
        const markerEndMs = Math.min(
          marker.occursAt.getTime() + 15 * 60_000,
          day.endsAt.getTime(),
        );
        const visibleMarkerStartMs = Math.min(
          marker.occursAt.getTime(),
          markerEndMs - 2 * 60_000,
        );
        const visualOverlapZone =
          containingZone ??
          day.activityZones.find(
            (candidate) =>
              visibleMarkerStartMs < candidate.endsAt.getTime() &&
              markerEndMs > candidate.startsAt.getTime(),
          );
        const zone = containingZone ?? visualOverlapZone;
        if (!zone) continue;
        const duration = zone.endsAt.getTime() - zone.startsAt.getTime();
        const offsetPercentage =
          duration > 0
            ? ((marker.occursAt.getTime() - zone.startsAt.getTime()) /
                duration) *
              100
            : 0;
        const zoneMarkers = markersByZoneId.get(zone.id) ?? [];
        zoneMarkers.push({
          id: marker.id,
          label: marker.detail
            ? `${marker.title} · ${marker.detail}`
            : marker.title,
          offsetPercentage: Math.max(0, Math.min(100, offsetPercentage)),
        });
        markersByZoneId.set(zone.id, zoneMarkers);
        embeddedMarkerIds.add(marker.id);
      }

      return [
        ...day.activityZones.map(
          (zone): ActivityTimelineEvent => ({
          id: `activity:${zone.id}`,
          start: { dateTime: zone.startsAt.toISOString() },
          end: { dateTime: zone.endsAt.toISOString() },
          title: zone.title,
          color: 'transparent',
          trackyKind: 'activity',
          sourceId: zone.activity.id,
          zoneColor: zone.color,
          zoneTitle: zone.title,
          durationLabel: formatDuration(zone.startsAt, zone.endsAt),
          isRunning: zone.isRunning,
          continuesBefore: zone.continuesBefore,
          continuesAfter: zone.continuesAfter,
          markers: markersByZoneId.get(zone.id) ?? [],
        }),
      ),
        ...day.eventMarkers
          .filter((marker) => !embeddedMarkerIds.has(marker.id))
          .map((marker): MarkerTimelineEvent => {
            const markerEndMs = Math.min(
              marker.occursAt.getTime() + 15 * 60_000,
              day.endsAt.getTime(),
            );
            // Calendar Kit removes a minute from regular event height. Pull a
            // marker near midnight slightly upward so it remains tappable.
            const markerStart = new Date(
              Math.min(marker.occursAt.getTime(), markerEndMs - 2 * 60_000),
            );
            return {
              id: `marker:${marker.id}`,
              start: { dateTime: markerStart.toISOString() },
              end: { dateTime: new Date(markerEndMs).toISOString() },
              title: marker.title,
              color: 'transparent',
              trackyKind: 'marker',
              sourceId: marker.event.id,
              markerTitle: marker.title,
              markerDetail: marker.detail,
            };
          }),
      ];
    },
    [day],
  );

  const focusHour = useMemo(() => {
    if (isSameLocalDay(selectedDate, now)) {
      return Math.max(0, now.getHours() + now.getMinutes() / 60 - 1.5);
    }
    const firstMoment =
      day.activityZones[0]?.startsAt ?? day.eventMarkers[0]?.occursAt;
    if (!firstMoment) return 8;
    return Math.max(0, firstMoment.getHours() + firstMoment.getMinutes() / 60 - 1);
  }, [day.activityZones, day.eventMarkers, now, selectedDate]);

  useEffect(() => {
    if (!calendarLoaded) return;
    const selectedTimestamp = selectedDate.getTime();
    if (lastFocusedDateRef.current === selectedTimestamp) return;
    lastFocusedDateRef.current = selectedTimestamp;
    const dateIsAlreadyVisible =
      visibleDateIdRef.current === toLocalDateId(selectedDate);
    let hourTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (!dateIsAlreadyVisible) {
        calendarRef.current?.goToDate({
          animatedDate: true,
          date: selectedDate,
        });
      }
      hourTimer = setTimeout(() => {
        calendarRef.current?.goToHour(focusHour, true);
      }, dateIsAlreadyVisible ? 0 : 100);
    }, 220);
    return () => {
      clearTimeout(timer);
      if (hourTimer) clearTimeout(hourTimer);
    };
  }, [calendarLoaded, focusHour, selectedDate]);

  const renderTimelineEvent = useCallback(
    (packedEvent: PackedEvent) => {
      const event = packedEvent as PackedEvent & TrackyTimelineEvent;
      if (event.trackyKind === 'marker') {
        return (
          <View style={styles.marker}>
            <View
              style={[
                styles.markerDot,
                { backgroundColor: theme.colors.accent },
              ]}
            />
            <View
              style={[
                styles.markerRule,
                { backgroundColor: colorWithAlpha(theme.colors.accent, 0.52) },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[styles.markerText, { color: theme.colors.text }]}
            >
              {event.markerTitle}
              {event.markerDetail ? ` · ${event.markerDetail}` : ''}
            </Text>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.activityZone,
            {
              backgroundColor: colorWithAlpha(event.zoneColor, 0.13),
              borderLeftColor: event.zoneColor,
              borderTopColor: colorWithAlpha(event.zoneColor, 0.2),
            },
          ]}
        >
          <View style={styles.zoneTitleRow}>
            <Text
              numberOfLines={1}
              style={[styles.zoneTitle, { color: theme.colors.text }]}
            >
              {event.continuesBefore ? '↥ ' : ''}
              {event.zoneTitle}
            </Text>
            <Text
              style={[
                styles.zoneDuration,
                { color: theme.colors.textSecondary },
              ]}
            >
              {event.isRunning ? 'NOW' : event.durationLabel}
            </Text>
          </View>
          {event.continuesAfter ? (
            <Text style={[styles.continues, { color: event.zoneColor }]}>
              continues ↓
            </Text>
          ) : null}
          {event.markers.map((marker) => (
            <View
              key={marker.id}
              style={[
                styles.zoneMarker,
                { top: `${marker.offsetPercentage}%` },
              ]}
            >
              <View
                style={[
                  styles.zoneMarkerDot,
                  { backgroundColor: theme.colors.accent },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.zoneMarkerText,
                  { color: theme.colors.text },
                ]}
              >
                {marker.label}
              </Text>
            </View>
          ))}
        </View>
      );
    },
    [theme],
  );

  const handlePressEvent = useCallback(
    (event: OnEventResponse) => {
      const trackyEvent = event as OnEventResponse & TrackyTimelineEvent;
      if (trackyEvent.trackyKind !== 'activity') return;
      const activity = activities.find(
        (candidate) => candidate.id === trackyEvent.sourceId,
      );
      if (activity) setEditingActivity(activity);
    },
    [activities],
  );

  const handleCalendarDateChanged = useCallback(
    (value: string) => {
      const nextDate = fromCalendarDate(value);
      if (!nextDate) return;

      visibleDateIdRef.current = toLocalDateId(nextDate);
      if (isSameLocalDay(nextDate, selectedDate)) return;
      setSelectedDate(nextDate);
    },
    [selectedDate, setSelectedDate],
  );

  const calendarTheme = useMemo(
    () => ({
      colors: {
        primary: theme.colors.accent,
        onPrimary: theme.colors.onAccent,
        background: theme.colors.background,
        onBackground: theme.colors.text,
        border: colorWithAlpha(theme.colors.text, theme.dark ? 0.08 : 0.07),
        text: theme.colors.textSecondary,
        surface: theme.colors.surface,
        onSurface: theme.colors.textSecondary,
      },
      hourBackgroundColor: 'transparent',
      hourBorderColor: 'transparent',
      hourTextStyle: {
        color: theme.colors.textTertiary,
        fontSize: 10,
        fontWeight: '600' as const,
      },
      nowIndicatorColor: theme.colors.accent,
      eventContainerStyle: {
        borderRadius: 0,
      },
    }),
    [theme],
  );

  if (!isFocused) {
    return (
      <View
        collapsable={false}
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <CalendarContainer
        allowDragToCreate={false}
        allowDragToEdit={false}
        allowHorizontalSwipe
        allowPinchToZoom={false}
        end={24 * 60}
        events={timelineEvents}
        hourWidth={52}
        initialDate={selectedDate}
        initialTimeIntervalHeight={68}
        maxTimeIntervalHeight={68}
        minRegularEventMinutes={0}
        minTimeIntervalHeight={68}
        numberOfDays={1}
        onDateChanged={handleCalendarDateChanged}
        onLoad={() => setCalendarLoaded(true)}
        onPressEvent={handlePressEvent}
        overlapType="no-overlap"
        ref={calendarRef}
        rightEdgeSpacing={12}
        scrollByDay
        scrollToNow={false}
        spaceFromBottom={TAB_BAR_CLEARANCE}
        spaceFromTop={timelineTopInset}
        start={0}
        theme={calendarTheme}
        timeInterval={60}
        useAllDayEvent={false}
      >
        <CalendarBody
          hourFormat="h a"
          renderEvent={renderTimelineEvent}
          showNowIndicator={isSameLocalDay(selectedDate, now)}
          showTimeColumnRightLine={false}
        />
      </CalendarContainer>

      <View
        pointerEvents="box-none"
        style={[styles.floatingControls, { top: controlTop }]}
      >
        <View
          onLayout={({ nativeEvent }) => {
            const nextHeight = Math.ceil(nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== controlHeight) {
              setControlHeight(nextHeight);
            }
          }}
          style={[
            styles.controlCard,
            {
              borderColor: colorWithAlpha(
                theme.colors.text,
                theme.dark ? 0.14 : 0.1,
              ),
              shadowColor: theme.dark ? '#000000' : '#64645F',
            },
          ]}
        >
          <BlurView
            intensity={78}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint={theme.dark ? 'dark' : 'light'}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colorWithAlpha(
                  theme.colors.background,
                  theme.dark ? 0.42 : 0.54,
                ),
              },
            ]}
          />
          <WixCalendarControl
            activities={activities}
            embedded
            events={events}
            now={now}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        </View>
      </View>

      <ActivityEditorSheet
        activity={editingActivity}
        onClose={() => setEditingActivity(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  floatingControls: {
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 20,
  },
  controlCard: {
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 8,
    overflow: 'hidden',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  activityZone: {
    borderLeftWidth: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: '100%',
    paddingHorizontal: spacing.sm,
    paddingTop: 5,
    position: 'relative',
    width: '100%',
  },
  zoneTitleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  zoneTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  zoneDuration: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  continues: {
    bottom: 3,
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    right: spacing.sm,
  },
  zoneMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    left: spacing.sm,
    position: 'absolute',
    right: spacing.sm,
    transform: [{ translateY: -6 }],
  },
  zoneMarkerDot: {
    borderRadius: 4,
    height: 7,
    marginRight: 5,
    width: 7,
  },
  zoneMarkerText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  marker: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    minHeight: 12,
    width: '100%',
  },
  markerDot: {
    borderRadius: 4,
    height: 8,
    marginLeft: 2,
    width: 8,
  },
  markerRule: {
    height: 1,
    marginHorizontal: 5,
    width: 24,
  },
  markerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
});
