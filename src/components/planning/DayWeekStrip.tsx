import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { radius, spacing, type as typography } from '../../design/theme';
import type { LocalDate } from '../../domain/models';
import {
  addLocalDays,
  isoWeekday,
  localDateAtNoon,
} from '../../domain/planning';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { GlassButton } from '../GlassButton';

function fullDateLabel(dateId: LocalDate, today: LocalDate) {
  const label = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(localDateAtNoon(dateId));
  return dateId === today ? `Today, ${label}` : label;
}

export function DayWeekStrip({
  markedDateIds,
  onSelectDate,
  selectedDate,
  today,
}: {
  markedDateIds: ReadonlySet<string>;
  onSelectDate: (date: LocalDate) => void;
  selectedDate: LocalDate;
  today: LocalDate;
}) {
  const { theme } = useTracky();
  const weekStart = addLocalDays(selectedDate, -(isoWeekday(selectedDate) - 1));
  const dates = Array.from({ length: 7 }, (_, index) =>
    addLocalDays(weekStart, index),
  );
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(localDateAtNoon(selectedDate));
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'narrow',
  });

  const shiftWeek = (amount: number) => {
    selectionHaptic();
    onSelectDate(addLocalDays(selectedDate, amount * 7));
  };
  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .onEnd(({ translationX, velocityX }) => {
      if (translationX < -56 || velocityX < -520) runOnJS(shiftWeek)(1);
      else if (translationX > 56 || velocityX > 520) runOnJS(shiftWeek)(-1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel={`Week of ${fullDateLabel(weekStart, today)}`}
        style={[
          styles.container,
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
            onPress={() => shiftWeek(-1)}
          />
          <Text style={[typography.headline, { color: theme.colors.text }]}>
            {monthLabel}
          </Text>
          <GlassButton
            accessibilityLabel="Next week"
            compact
            icon={ArrowRight01Icon}
            onPress={() => shiftWeek(1)}
          />
        </View>
        <View style={styles.week}>
          {dates.map((date) => {
            const selected = date === selectedDate;
            const isToday = date === today;
            const marked = markedDateIds.has(date);
            const nativeDate = localDateAtNoon(date);
            return (
              <Pressable
                accessibilityLabel={`${fullDateLabel(date, today)}${marked ? ', has items' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={date}
                onPress={() => {
                  selectionHaptic();
                  onSelectDate(date);
                }}
                style={({ pressed }) => [
                  styles.day,
                  { opacity: pressed ? 0.52 : 1 },
                ]}
              >
                <Text
                  style={[
                    typography.caption2,
                    {
                      color: isToday
                        ? theme.colors.accent
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {weekdayFormatter.format(nativeDate)}
                </Text>
                <View
                  style={[
                    styles.numberCircle,
                    selected && { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      typography.subheadline,
                      {
                        color: selected
                          ? theme.colors.onAccent
                          : isToday
                            ? theme.colors.accent
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {nativeDate.getDate()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: marked
                        ? selected
                          ? theme.colors.accent
                          : theme.colors.textTertiary
                        : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  day: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 44,
  },
  dot: { borderRadius: radius.pill, height: 4, marginTop: 2, width: 4 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  numberCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    marginTop: spacing.xxs,
    width: 30,
  },
  week: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
});
