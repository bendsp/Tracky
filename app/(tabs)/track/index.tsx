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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassButton } from '../../../src/components/GlassButton';
import { Icon } from '../../../src/components/Icon';
import { DayItemRow } from '../../../src/components/planning/DayItemRow';
import { DayWeekStrip } from '../../../src/components/planning/DayWeekStrip';
import { SectionHeader } from '../../../src/components/Screen';
import {
  radius,
  spacing,
  tabBarInset,
  type as typography,
  type Theme,
} from '../../../src/design/theme';
import type { DayPart, LocalDate, TaskDraft } from '../../../src/domain/models';
import {
  buildDayPlan,
  addLocalDays,
  dayPartLabels,
  dayPartOrder,
  isoWeekday,
  localDateAtNoon,
  plannedOrRecordedDateIds,
  unfinishedTasksBefore,
  type DayPlanItem,
} from '../../../src/domain/planning';
import { useDaySelection } from '../../../src/store/DaySelectionProvider';
import { useTrackerEditorSession } from '../../../src/store/TrackerEditorSession';
import { useTracky } from '../../../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../../../src/utils/haptics';

const glassAvailable = isGlassEffectAPIAvailable();

function dayTitle(selectedDate: LocalDate, today: LocalDate) {
  const selected = localDateAtNoon(selectedDate);
  const todayDate = localDateAtNoon(today);
  const difference = Math.round(
    (selected.getTime() - todayDate.getTime()) / 86_400_000,
  );
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  if (difference === -1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(selected);
}

function clockTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const trackerEditor = useTrackerEditorSession();
  const { now, selectedDate, selectDate, today } = useDaySelection();
  const {
    createTask,
    deleteRoutine,
    deleteTask,
    events,
    routineProgress,
    routines,
    setScheduleDateSkipped,
    tasks,
    theme,
    toggleTask,
    toggleTrackerCheckIn,
    trackers,
  } = useTracky();

  const plan = useMemo(
    () =>
      buildDayPlan({
        date: selectedDate,
        events,
        routineProgress,
        routines,
        tasks,
        trackers,
      }),
    [events, routineProgress, routines, selectedDate, tasks, trackers],
  );
  const markedDateIds = useMemo(() => {
    const weekStart = addLocalDays(
      selectedDate,
      -(isoWeekday(selectedDate) - 1),
    );
    const dates = Array.from({ length: 7 }, (_, index) =>
      addLocalDays(weekStart, index),
    );
    return plannedOrRecordedDateIds({
      dates,
      events,
      routineProgress,
      routines,
      tasks,
      trackers,
    });
  }, [events, routineProgress, routines, selectedDate, tasks, trackers]);
  const unfinished = useMemo(
    () => selectedDate === today ? unfinishedTasksBefore(tasks, today) : [],
    [selectedDate, tasks, today],
  );
  const sections = dayPartOrder
    .map((part) => ({
      part,
      items: plan.filter((item) => item.dayPart === part),
    }))
    .filter((section) => section.items.length);

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
        params: { routineId: item.source.id, date: selectedDate },
      });
    } else {
      router.push({
        pathname: '/tracker-detail',
        params: { trackerId: item.source.id, date: selectedDate },
      });
    }
  };

  const completeItem = (item: DayPlanItem) => {
    if (item.skipped) {
      setScheduleDateSkipped(item.kind, item.source.id, selectedDate, false);
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
      const result = toggleTrackerCheckIn(
        item.source.id,
        selectedDate,
        actionTime,
      );
      if (result === 'completed') successHaptic();
      else if (result) tapHaptic();
    }
  };

  const moreActions = (item: DayPlanItem) => {
    const edit = () => {
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

    if (item.kind === 'task') {
      Alert.alert(item.source.name, undefined, [
        { text: 'Edit', onPress: edit },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(item.source.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    const skipped = item.source.schedule.exceptions.some(
      (exception) =>
        exception.date === selectedDate && exception.behavior === 'skip',
    );
    Alert.alert(item.source.name, undefined, [
      { text: 'Edit', onPress: edit },
      {
        text: skipped ? 'Restore this day' : 'Skip this day',
        onPress: () =>
          setScheduleDateSkipped(
            item.kind,
            item.source.id,
            selectedDate,
            !skipped,
          ),
      },
      ...(item.kind === 'routine'
        ? [
            {
              text: 'Delete routine',
              style: 'destructive' as const,
              onPress: () => deleteRoutine(item.source.id),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Stack.Screen options={{ title: dayTitle(selectedDate, today) }} />
        {selectedDate !== today ? (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button onPress={() => selectDate(today)}>
              Today
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        ) : null}

        <DayWeekStrip
          markedDateIds={markedDateIds}
          onSelectDate={selectDate}
          selectedDate={selectedDate}
          today={today}
        />

        {unfinished.length ? (
          <Pressable
            accessibilityLabel={`${unfinished.length} unfinished ${unfinished.length === 1 ? 'task' : 'tasks'} from earlier`}
            accessibilityRole="button"
            onPress={() => router.push('/earlier-tasks')}
            style={({ pressed }) => [
              styles.earlier,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.62 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.earlierIcon,
                { backgroundColor: theme.colors.surfaceMuted },
              ]}
            >
              <Icon
                color={theme.colors.textSecondary}
                icon={Tick02Icon}
                size={20}
              />
            </View>
            <Text style={[typography.headline, { color: theme.colors.text }]}>
              {unfinished.length} unfinished from earlier
            </Text>
            <Icon
              color={theme.colors.textTertiary}
              icon={ArrowRight01Icon}
              size={18}
            />
          </Pressable>
        ) : null}

        {sections.map((section) => (
          <DaySection
            items={section.items}
            key={section.part}
            now={now}
            onComplete={completeItem}
            onMore={moreActions}
            onOpen={openItem}
            part={section.part}
            selectedDate={selectedDate}
            theme={theme}
            today={today}
          />
        ))}

        {!sections.length && !unfinished.length ? (
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
            <Text style={[typography.title3, { color: theme.colors.text }]}>A clear day</Text>
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

      <QuickTaskComposer
        createTask={createTask}
        selectedDate={selectedDate}
        theme={theme}
      />
    </>
  );
}

function DaySection({
  items,
  now,
  onComplete,
  onMore,
  onOpen,
  part,
  selectedDate,
  theme,
  today,
}: {
  items: DayPlanItem[];
  now: Date;
  onComplete: (item: DayPlanItem) => void;
  onMore: (item: DayPlanItem) => void;
  onOpen: (item: DayPlanItem) => void;
  part: DayPart;
  selectedDate: LocalDate;
  theme: Theme;
  today: LocalDate;
}) {
  const nowTime = clockTime(now);
  const currentPart = now.getHours() < 12
    ? 'morning'
    : now.getHours() < 17
      ? 'afternoon'
      : 'evening';
  const canShowNow =
    selectedDate === today &&
    part === currentPart &&
    items.some((item) => item.time);
  const nowIndex = canShowNow
    ? items.findIndex((item) => !item.time || item.time >= nowTime)
    : -1;
  const insertionIndex = canShowNow
    ? nowIndex === -1
      ? items.length
      : nowIndex
    : -1;

  return (
    <View>
      <SectionHeader>{dayPartLabels[part]}</SectionHeader>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {items.map((item, index) => (
          <View key={item.id}>
            {insertionIndex === index ? <NowLine theme={theme} /> : null}
            <DayItemRow
              divided={index > 0 || insertionIndex === index}
              item={item}
              onComplete={() => onComplete(item)}
              onMore={() => onMore(item)}
              onOpen={() => onOpen(item)}
              theme={theme}
            />
          </View>
        ))}
        {insertionIndex === items.length ? <NowLine theme={theme} /> : null}
      </View>
    </View>
  );
}

function NowLine({ theme }: { theme: Theme }) {
  return (
    <View accessibilityLabel="Now" style={styles.nowLineRow}>
      <Text style={[typography.caption2, { color: theme.colors.textTertiary }]}>Now</Text>
      <View style={[styles.nowLine, { backgroundColor: theme.colors.separator }]} />
    </View>
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
  },
  earlier: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
    paddingHorizontal: spacing.md,
  },
  earlierIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
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
  nowLine: { flex: 1, height: StyleSheet.hairlineWidth },
  nowLineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 22,
    paddingHorizontal: spacing.md,
  },
  sectionCard: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
