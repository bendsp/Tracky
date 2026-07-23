import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CalendarProvider,
  WeekCalendar,
} from 'react-native-calendars';
import type {
  MarkedDates,
  Theme as WixCalendarTheme,
} from 'react-native-calendars/src/types';

import { radius, spacing, type as typography } from '../../design/theme';
import { useTracky } from '../../store/TrackyProvider';
import { GlassButton } from '../GlassButton';
import type { CalendarControlProps } from './CalendarTimelineScreen';
import {
  fromLocalDateId,
  recordedDateIds,
  toLocalDateId,
} from './dateUtils';

export function WixCalendarControl({
  activities,
  events,
  now,
  onSelectDate,
  selectedDate,
}: CalendarControlProps) {
  const { theme } = useTracky();
  const [calendarWidth, setCalendarWidth] = useState(0);
  const [visibleDate, setVisibleDate] = useState(() => {
    const date = new Date(selectedDate);
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const selectedId = toLocalDateId(selectedDate);
  const visibleId = toLocalDateId(visibleDate);
  const todayId = toLocalDateId(now);
  const visibleWeekId = useMemo(() => {
    const weekStart = new Date(visibleDate);
    const daysSinceMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    weekStart.setHours(12, 0, 0, 0);
    return toLocalDateId(weekStart);
  }, [visibleDate]);

  useEffect(() => {
    const date = new Date(selectedDate);
    date.setHours(12, 0, 0, 0);
    setVisibleDate(date);
  }, [selectedId]);
  const markingNow = useMemo(() => {
    const date = fromLocalDateId(todayId);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [todayId]);

  const markedDates = useMemo<MarkedDates>(() => {
    const dates: MarkedDates = {};
    for (const dateId of recordedDateIds(activities, events, markingNow)) {
      dates[dateId] = {
        marked: true,
        dotColor: theme.colors.accent,
      };
    }
    dates[selectedId] = {
      ...dates[selectedId],
      selected: true,
      selectedColor: theme.colors.accent,
      selectedTextColor: theme.colors.onAccent,
    };
    return dates;
  }, [activities, events, markingNow, selectedId, theme]);

  const calendarTheme = useMemo<WixCalendarTheme>(
    () => ({
      arrowColor: theme.colors.text,
      backgroundColor: theme.colors.surface,
      calendarBackground: theme.colors.surface,
      dayTextColor: theme.colors.text,
      dotColor: theme.colors.accent,
      monthTextColor: theme.colors.text,
      selectedDayBackgroundColor: 'transparent',
      selectedDayTextColor: theme.colors.text,
      textDayFontSize: 15,
      textDayFontWeight: '600',
      textDayHeaderFontSize: 11,
      textDayHeaderFontWeight: '700',
      textDisabledColor: theme.colors.textTertiary,
      textMonthFontSize: 18,
      textMonthFontWeight: '700',
      textSectionTitleColor: theme.colors.textTertiary,
      todayTextColor: theme.colors.accent,
    }),
    [theme],
  );

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(visibleDate);

  const moveWeek = (amount: number) => {
    const nextDate = new Date(visibleDate);
    nextDate.setDate(nextDate.getDate() + amount * 7);
    nextDate.setHours(12, 0, 0, 0);
    setVisibleDate(nextDate);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <GlassButton
          accessibilityLabel="Previous week"
          compact
          icon={ArrowLeft01Icon}
          onPress={() => moveWeek(-1)}
        />
        <Text style={[typography.section, { color: theme.colors.text }]}>
          {monthLabel}
        </Text>
        <GlassButton
          accessibilityLabel="Next week"
          compact
          icon={ArrowRight01Icon}
          onPress={() => moveWeek(1)}
        />
      </View>
      <CalendarProvider
        date={visibleId}
        key={`${theme.scheme}:${visibleWeekId}`}
        theme={calendarTheme}
      >
        <View
          onLayout={({ nativeEvent }) => {
            const nextWidth = Math.round(nativeEvent.layout.width);
            if (nextWidth > 0 && nextWidth !== calendarWidth) {
              setCalendarWidth(nextWidth);
            }
          }}
          style={styles.weekViewport}
        >
          {calendarWidth > 0 ? (
            <WeekCalendar
              allowShadow={false}
              calendarHeight={46}
              calendarWidth={calendarWidth}
              current={visibleId}
              firstDay={1}
              markedDates={markedDates}
              onDayPress={({ dateString }) =>
                onSelectDate(fromLocalDateId(dateString))
              }
              theme={calendarTheme}
            />
          ) : null}
        </View>
      </CalendarProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  weekViewport: {
    minHeight: 88,
    overflow: 'hidden',
  },
});
