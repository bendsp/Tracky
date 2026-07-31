import {
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '../../../src/components/GlassButton';
import { Icon } from '../../../src/components/Icon';
import { AgendaItemRow } from '../../../src/components/planning/AgendaItemRow';
import { DayWeekStrip } from '../../../src/components/planning/DayWeekStrip';
import { HabitShelf } from '../../../src/components/planning/HabitShelf';
import { SectionHeader } from '../../../src/components/Screen';
import {
  navigationBarHeight,
  radius,
  spacing,
  tabBarInset,
  type as typography,
  type Theme,
} from '../../../src/design/theme';
import type { LocalDate, TaskDraft } from '../../../src/domain/models';
import {
  addLocalDays,
  buildDayPlan,
  localDateAtNoon,
  localDaysBetween,
  partitionDayPlan,
  unfinishedTasksBefore,
  type DayPlanItem,
} from '../../../src/domain/planning';
import { useDaySelection } from '../../../src/store/DaySelectionProvider';
import { useTrackerEditorSession } from '../../../src/store/TrackerEditorSession';
import { useTracky } from '../../../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../../../src/utils/haptics';

const glassAvailable = isGlassEffectAPIAvailable();

/**
 * How far the day pager reaches in each direction. Normal swiping keeps this
 * window stable; an external jump beyond it recentres once without animation,
 * so week navigation stays effectively unbounded without invalid list indexes.
 */
const DAY_WINDOW = 180;

function dayTitle(selectedDate: LocalDate, today: LocalDate) {
  const difference = localDaysBetween(today, selectedDate);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  if (difference === -1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(localDateAtNoon(selectedDate));
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { selectedDate, selectDate, today } = useDaySelection();
  const { createTask, theme } = useTracky();

  const [windowCenter, setWindowCenter] = useState<LocalDate>(today);
  const anchor = useMemo(
    () => addLocalDays(windowCenter, -DAY_WINDOW),
    [windowCenter],
  );
  const dates = useMemo(
    () =>
      Array.from({ length: DAY_WINDOW * 2 + 1 }, (_, index) =>
        addLocalDays(anchor, index),
      ),
    [anchor],
  );
  const selectedIndex = localDaysBetween(anchor, selectedDate);

  const listRef = useRef<FlatList<LocalDate>>(null);
  const [width, setWidth] = useState(0);
  // The pager and the selected date drive each other, so each side records the
  // index it just moved to and the other side skips the echo.
  const settledIndex = useRef(selectedIndex);
  const pendingRecenter = useRef(false);
  const dragOriginIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!width) return;

    if (selectedIndex < 0 || selectedIndex >= dates.length) {
      pendingRecenter.current = true;
      settledIndex.current = DAY_WINDOW;
      setWindowCenter(selectedDate);
      return;
    }

    if (pendingRecenter.current) {
      const frame = requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          animated: false,
          index: selectedIndex,
        });
        pendingRecenter.current = false;
      });
      return () => cancelAnimationFrame(frame);
    }

    if (settledIndex.current === selectedIndex) return;
    const distance = Math.abs(settledIndex.current - selectedIndex);
    settledIndex.current = selectedIndex;
    listRef.current?.scrollToIndex({
      animated: distance <= 7,
      index: selectedIndex,
    });
  }, [dates.length, selectedDate, selectedIndex, width]);

  const handleSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width || pendingRecenter.current) return;
      const rawIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      const origin = dragOriginIndex.current;
      const index =
        origin === null
          ? rawIndex
          : Math.max(origin - 1, Math.min(origin + 1, rawIndex));
      dragOriginIndex.current = null;
      if (index !== rawIndex) {
        listRef.current?.scrollToIndex({ animated: true, index });
      }
      const date = dates[index];
      if (!date || index === settledIndex.current) return;
      settledIndex.current = index;
      selectDate(date);
    },
    [dates, selectDate, width],
  );

  return (
    <View
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen
        options={{
          headerLargeTitleEnabled: false,
          title: dayTitle(selectedDate, today),
        }}
      />
      {selectedDate !== today ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => selectDate(today)}>
            Today
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}

      <View
        style={[
          styles.pinned,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + navigationBarHeight,
          },
        ]}
      >
        <WeekStrip selectedDate={selectedDate} selectDate={selectDate} today={today} />
      </View>

      {width > 0 ? (
        <FlatList
          data={dates}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({
            index,
            length: width,
            offset: width * index,
          })}
          initialNumToRender={1}
          initialScrollIndex={
            selectedIndex >= 0 && selectedIndex < dates.length
              ? selectedIndex
              : DAY_WINDOW
          }
          horizontal
          keyExtractor={(date) => date}
          keyboardShouldPersistTaps="handled"
          maxToRenderPerBatch={1}
          onScrollBeginDrag={(event) => {
            if (!width) return;
            dragOriginIndex.current = Math.round(
              event.nativeEvent.contentOffset.x / width,
            );
          }}
          onMomentumScrollEnd={handleSettle}
          onScrollToIndexFailed={({ index }) => {
            listRef.current?.scrollToOffset({
              animated: false,
              offset: width * index,
            });
          }}
          pagingEnabled
          ref={listRef}
          removeClippedSubviews
          renderItem={({ item }) => (
            <DayPage
              date={item}
              selected={item === selectedDate}
              today={today}
              width={width}
            />
          )}
          showsHorizontalScrollIndicator={false}
          windowSize={3}
        />
      ) : null}

      <QuickTaskComposer
        createTask={createTask}
        selectedDate={selectedDate}
        theme={theme}
      />
    </View>
  );
}

function WeekStrip({
  selectDate,
  selectedDate,
  today,
}: {
  selectDate: (date: LocalDate) => void;
  selectedDate: LocalDate;
  today: LocalDate;
}) {
  const [visibleDate, setVisibleDate] = useState(selectedDate);

  useEffect(() => {
    setVisibleDate(selectedDate);
  }, [selectedDate]);

  return (
    <DayWeekStrip
      onChangeVisibleDate={setVisibleDate}
      onSelectDate={selectDate}
      selectedDate={selectedDate}
      today={today}
      visibleDate={visibleDate}
    />
  );
}

function DayPage({
  date,
  selected,
  today,
  width,
}: {
  date: LocalDate;
  selected: boolean;
  today: LocalDate;
  width: number;
}) {
  const router = useRouter();
  const trackerEditor = useTrackerEditorSession();
  const {
    deleteRoutine,
    deleteTask,
    events,
    routineProgress,
    routines,
    setScheduleDateSkipped,
    tasks,
    theme,
    toggleRoutineStep,
    toggleTask,
    toggleTrackerCheckIn,
    trackers,
  } = useTracky();
  const [showSkipped, setShowSkipped] = useState(false);

  const plan = useMemo(
    () =>
      buildDayPlan({
        date,
        events,
        routineProgress,
        routines,
        tasks,
        trackers,
      }),
    [date, events, routineProgress, routines, tasks, trackers],
  );
  const { active, skipped } = useMemo(() => partitionDayPlan(plan), [plan]);
  const habits = useMemo(
    () => active.filter((item) => item.kind === 'tracker'),
    [active],
  );
  const agenda = useMemo(
    () =>
      active
        .filter((item) => item.kind !== 'tracker')
        .sort((left, right) => {
          if (left.time && right.time) return left.time.localeCompare(right.time);
          if (left.time) return -1;
          if (right.time) return 1;
          return left.source.createdAt.localeCompare(right.source.createdAt);
        }),
    [active],
  );
  const unfinished = useMemo(
    () => (date === today ? unfinishedTasksBefore(tasks, today) : []),
    [date, tasks, today],
  );

  const openItem = (item: DayPlanItem) => {
    tapHaptic();
    if (item.kind === 'task') {
      router.push({
        pathname: '/task-editor',
        params: { taskId: item.source.id },
      });
    } else if (item.kind === 'routine') {
      router.push({
        pathname: '/routine-runner',
        params: { routineId: item.source.id, date },
      });
    } else {
      router.push({
        pathname: '/tracker-detail',
        params: { trackerId: item.source.id, date },
      });
    }
  };

  const completeItem = (item: DayPlanItem) => {
    if (item.skipped) {
      setScheduleDateSkipped(item.kind, item.source.id, date, false);
      tapHaptic();
      return;
    }
    const actionTime = new Date();
    if (item.kind === 'task') {
      const completed = toggleTask(item.source.id, actionTime);
      completed ? successHaptic() : tapHaptic();
    } else if (item.kind === 'routine') {
      openItem(item);
    } else {
      const result = toggleTrackerCheckIn(item.source.id, date, actionTime);
      if (result === 'completed') successHaptic();
      else if (result) tapHaptic();
    }
  };

  const editItem = (item: DayPlanItem) => {
    if (item.kind === 'task') {
      router.push({
        pathname: '/task-editor',
        params: { taskId: item.source.id },
      });
    } else if (item.kind === 'routine') {
      router.push({
        pathname: '/routine-editor',
        params: { routineId: item.source.id },
      });
    } else {
      trackerEditor.begin(item.source);
      router.push('/tracker-editor');
    }
  };

  const confirmDelete = (name: string, remove: () => void) => {
    Alert.alert(`Delete ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const showHabitActions = (
    habit: Extract<DayPlanItem, { kind: 'tracker' }>,
  ) => {
    tapHaptic();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 0,
        options: ['Cancel', 'Edit Habit', 'Skip This Day'],
        title: habit.source.name,
      },
      (index) => {
        if (index === 1) editItem(habit);
        if (index === 2) {
          setScheduleDateSkipped('tracker', habit.source.id, date, true);
        }
      },
    );
  };

  /**
   * Agenda actions live behind a long press rather than a trailing button. A
   * checklist reads as a checklist only while every row is a checkmark and a
   * name; a control on each one turns it back into a table.
   */
  const showActions = (item: DayPlanItem) => {
    tapHaptic();
    const actions: { destructive?: boolean; label: string; run: () => void }[] =
      [{ label: 'Edit', run: () => editItem(item) }];

    if (item.kind === 'task') {
      actions.push({
        destructive: true,
        label: 'Delete',
        run: () =>
          confirmDelete(item.source.name, () => deleteTask(item.source.id)),
      });
    } else {
      const kind = item.kind;
      actions.push({
        label: item.skipped ? 'Restore This Day' : 'Skip This Day',
        run: () =>
          setScheduleDateSkipped(kind, item.source.id, date, !item.skipped),
      });
      if (kind === 'routine') {
        actions.push({
          destructive: true,
          label: 'Delete Routine',
          run: () =>
            confirmDelete(item.source.name, () =>
              deleteRoutine(item.source.id),
            ),
        });
      }
    }

    const destructiveIndex = actions.findIndex((action) => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: actions.length,
        destructiveButtonIndex:
          destructiveIndex === -1 ? undefined : destructiveIndex,
        options: [...actions.map((action) => action.label), 'Cancel'],
        title: item.source.name,
      },
      (index) => actions[index]?.run(),
    );
  };

  const renderAgendaRow = (
    item: Extract<DayPlanItem, { kind: 'routine' | 'task' }>,
  ) => (
    <AgendaItemRow
      item={item}
      key={item.id}
      onCompleteTask={() => completeItem(item)}
      onLongPress={() => showActions(item)}
      onOpen={() => openItem(item)}
      onToggleRoutineStep={(stepId) => {
        if (item.kind !== 'routine') return;
        const result = toggleRoutineStep(item.source.id, date, stepId);
        if (result === 'completed') successHaptic();
        else if (result) tapHaptic();
      }}
      theme={theme}
    />
  );

  const empty = !active.length && !skipped.length && !unfinished.length;

  return (
    <ScrollView
      accessibilityElementsHidden={!selected}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarInset + 104 },
      ]}
      showsVerticalScrollIndicator={false}
      importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
      style={{ width }}
    >
      {habits.length ? (
        <View>
          <SectionHeader>Habits</SectionHeader>
          <HabitShelf
            habits={habits}
            onCheckIn={completeItem}
            onEdit={editItem}
            onLongPress={showHabitActions}
            onOpen={openItem}
            onSkip={(habit) =>
              setScheduleDateSkipped('tracker', habit.source.id, date, true)
            }
            theme={theme}
          />
        </View>
      ) : null}

      {unfinished.length ? (
        <Pressable
          accessibilityLabel={`${unfinished.length} unfinished ${unfinished.length === 1 ? 'task' : 'tasks'} from earlier`}
          accessibilityRole="button"
          onPress={() => router.push('/earlier-tasks')}
          style={({ pressed }) => [
            styles.earlier,
            { opacity: pressed ? 0.58 : 1 },
          ]}
        >
          <Text
            style={[
              typography.subheadline,
              styles.earlierCopy,
              { color: theme.colors.textSecondary },
            ]}
          >
            {unfinished.length} unfinished from earlier
          </Text>
          <Icon
            color={theme.colors.textTertiary}
            icon={ArrowRight01Icon}
            size={16}
          />
        </Pressable>
      ) : null}

      {/*
        One agenda, not a timed list and an untimed one. Splitting them put the
        least urgent things under their own heading and made an empty time
        column look like a second category.
      */}
      {agenda.length ? (
        <View style={styles.section}>
          <SectionHeader>Agenda</SectionHeader>
          {agenda.map((item) => renderAgendaRow(item))}
        </View>
      ) : null}

      {skipped.length ? (
        <View>
          <Pressable
            accessibilityLabel={`${skipped.length} skipped ${skipped.length === 1 ? 'item' : 'items'}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: showSkipped }}
            onPress={() => {
              tapHaptic();
              setShowSkipped((current) => !current);
            }}
            style={({ pressed }) => [
              styles.skippedToggle,
              { opacity: pressed ? 0.58 : 1 },
            ]}
          >
            <Text
              style={[typography.footnote, { color: theme.colors.textSecondary }]}
            >
              {skipped.length} skipped
            </Text>
            <Text
              style={[typography.footnote, { color: theme.colors.textTertiary }]}
            >
              {showSkipped ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
          {showSkipped
            ? skipped.map((item) => (
                <Pressable
                  accessibilityHint="Restores this item for the day"
                  accessibilityLabel={`Restore ${item.source.name} for this day`}
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => {
                    if (item.kind === 'task') return;
                    setScheduleDateSkipped(item.kind, item.source.id, date, false);
                    tapHaptic();
                  }}
                  style={({ pressed }) => [
                    styles.skippedRow,
                    { opacity: pressed ? 0.58 : 1 },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.body,
                      styles.skippedName,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {item.source.name}
                  </Text>
                  <Text
                    style={[
                      typography.footnote,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    Restore
                  </Text>
                </Pressable>
              ))
            : null}
        </View>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon
              color={theme.colors.textSecondary}
              icon={Tick02Icon}
              size={28}
            />
          </View>
          <Text style={[typography.title3, { color: theme.colors.text }]}>
            A clear day
          </Text>
          <Text
            style={[
              typography.subheadline,
              styles.emptyCopy,
              { color: theme.colors.textSecondary },
            ]}
          >
            Add something you want to remember, then get back to your day.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function QuickTaskComposer({
  createTask,
  selectedDate,
  theme,
}: {
  createTask: (draft: TaskDraft) => string;
  selectedDate: LocalDate;
  theme: Theme;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => input.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hidden = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardInset(0);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const created = createTask({
      name: cleanName,
      scheduledDate: selectedDate,
      dayPart: 'anytime',
      time: null,
      durationMinutes: null,
    });
    if (!created) return;
    successHaptic();
    setName('');
    AccessibilityInfo.announceForAccessibility(`${cleanName} added`);
    setTimeout(() => input.current?.focus(), 50);
  };

  return (
    <GlassContainer
      spacing={spacing.sm}
      style={[
        styles.composer,
        { bottom: keyboardInset ? keyboardInset + spacing.md : 112 },
      ]}
    >
      {open ? (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.composerField,
            !glassAvailable && { backgroundColor: theme.colors.glassFallback },
          ]}
        >
          <TextInput
            accessibilityLabel="New task name"
            autoCapitalize="sentences"
            blurOnSubmit={false}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="What do you need to remember?"
            placeholderTextColor={theme.colors.textTertiary}
            ref={input}
            returnKeyType="done"
            style={[typography.body, styles.input, { color: theme.colors.text }]}
            value={name}
          />
          <Pressable
            accessibilityLabel="Add task"
            accessibilityRole="button"
            accessibilityState={{ disabled: !name.trim() }}
            disabled={!name.trim()}
            onPress={submit}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: theme.colors.accent,
                opacity: !name.trim() ? 0.3 : pressed ? 0.62 : 1,
              },
            ]}
          >
            <Icon
              color={theme.colors.onAccent}
              icon={Add01Icon}
              size={20}
              strokeWidth={2.2}
            />
          </Pressable>
        </GlassView>
      ) : null}
      <GlassButton
        accessibilityLabel={open ? 'Close quick capture' : 'Add a task'}
        icon={open ? Cancel01Icon : Add01Icon}
        onPress={() => {
          tapHaptic();
          setOpen((current) => !current);
        }}
        prominent
      />
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  composer: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    right: spacing.lg,
    zIndex: 21,
  },
  composerField: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    minHeight: 54,
    overflow: 'hidden',
    width: 294,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  earlier: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
  },
  earlierCopy: { flex: 1 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyCopy: { marginTop: spacing.xs, maxWidth: 300, textAlign: 'center' },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 62,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 62,
  },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pinned: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  screen: { flex: 1 },
  section: { gap: spacing.xxs },
  skippedName: { flex: 1 },
  skippedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  skippedToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  submit: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 38,
  },
});
