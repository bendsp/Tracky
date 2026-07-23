import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../../src/components/Icon';
import { TrackerEditorSheet } from '../../../src/components/tracking/TrackerEditorSheet';
import { TrackerIcon } from '../../../src/components/tracking/TrackerIcon';
import {
  colorWithAlpha,
  radius,
  spacing,
  type as typography,
  type Theme,
} from '../../../src/design/theme';
import type { TrackedEvent, Tracker } from '../../../src/domain/models';
import { trackerSummary } from '../../../src/domain/tracking';
import { useTimeframeNow } from '../../../src/hooks/useTimeframeNow';
import { useTracky } from '../../../src/store/TrackyProvider';

const ROW_STRIDE = 138;

export default function TrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deleteTracker, events, reorderTrackers, theme, trackers } = useTracky();
  const summaryNow = useTimeframeNow();
  const [editing, setEditing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const longPressEditStartedAt = useRef(0);

  const enterEditing = () => {
    if (editing) return;
    longPressEditStartedAt.current = Date.now();
    setEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const confirmDelete = (tracker: Tracker) => {
    if (Date.now() - longPressEditStartedAt.current < 1_000) return;
    const count = events.filter((event) => event.trackerId === tracker.id).length;
    Alert.alert(
      `Delete ${tracker.name}?`,
      count
        ? `This also deletes ${count} ${count === 1 ? 'entry' : 'entries'}.`
        : 'This tracker has no entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTracker(tracker.id),
        },
      ],
    );
  };

  const moveTracker = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const ordered = [...trackers];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    reorderTrackers(ordered.map((tracker) => tracker.id));
    Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityLabel={editing ? 'Done editing trackers' : 'Edit trackers'}
              accessibilityRole="button"
              onPress={() => {
                longPressEditStartedAt.current = 0;
                setEditing((value) => !value);
              }}
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>
                {editing ? 'Done' : 'Edit'}
              </Text>
            </Pressable>
          ),
          title: 'Track',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 150 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {trackers.length ? null : (
          <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
            Make a tracker for anything you want to remember.
          </Text>
        )}
        {trackers.map((tracker, index) => (
          <SortableTrackerRow
            editing={editing}
            eventCount={
              events.filter((event) => event.trackerId === tracker.id).length
            }
            events={events}
            index={index}
            key={tracker.id}
            now={summaryNow}
            onDelete={() => confirmDelete(tracker)}
            onEnterEditing={enterEditing}
            onMove={moveTracker}
            onOpen={() => router.push(`/track/${tracker.id}`)}
            theme={theme}
            tracker={tracker}
            trackerCount={trackers.length}
          />
        ))}
        <Pressable
          accessibilityLabel="Create a new tracker"
          accessibilityRole="button"
          onPress={() => setEditorOpen(true)}
          style={({ pressed }) => [
            styles.newCard,
            {
              backgroundColor: pressed
                ? theme.colors.accentSoft
                : theme.colors.surface,
              borderColor: pressed ? theme.colors.accent : theme.colors.border,
            },
          ]}
        >
          <View
            style={[styles.newIcon, { backgroundColor: theme.colors.accentSoft }]}
          >
            <Icon color={theme.colors.accent} icon={Add01Icon} size={23} />
          </View>
          <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
            New
          </Text>
        </Pressable>
      </ScrollView>
      <TrackerEditorSheet
        onClose={() => setEditorOpen(false)}
        visible={editorOpen}
      />
    </View>
  );
}

function SortableTrackerRow({
  editing,
  eventCount,
  events,
  index,
  now,
  onDelete,
  onEnterEditing,
  onMove,
  onOpen,
  theme,
  tracker,
  trackerCount,
}: {
  editing: boolean;
  eventCount: number;
  events: TrackedEvent[];
  index: number;
  now: Date;
  onDelete: () => void;
  onEnterEditing: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onOpen: () => void;
  theme: Theme;
  tracker: Tracker;
  trackerCount: number;
}) {
  const translation = useRef(new Animated.Value(0)).current;
  const active = useRef(new Animated.Value(0)).current;
  const summary = trackerSummary(tracker, events, now);

  const settle = (dy: number) => {
    const offset = Math.round(dy / ROW_STRIDE);
    const target = Math.max(0, Math.min(trackerCount - 1, index + offset));
    Animated.parallel([
      Animated.spring(translation, {
        friction: 8,
        tension: 90,
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.timing(active, {
        duration: 160,
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start(() => onMove(index, target));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          translation.setOffset(0);
          translation.setValue(0);
          Animated.timing(active, {
            duration: 120,
            toValue: 1,
            useNativeDriver: false,
          }).start();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => undefined,
          );
        },
        onPanResponderMove: (_, gesture) => translation.setValue(gesture.dy),
        onPanResponderRelease: (_, gesture) => settle(gesture.dy),
        onPanResponderTerminate: (_, gesture) => settle(gesture.dy),
        onStartShouldSetPanResponder: () => editing,
      }),
    [active, editing, index, trackerCount, translation],
  );

  const animatedStyle = {
    opacity: active.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }),
    transform: [
      { translateY: translation },
      {
        scale: active.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.025],
        }),
      },
    ],
    zIndex: active.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
  };

  const copy = (
    <View style={styles.copy}>
      <Text
        numberOfLines={1}
        style={[typography.cardTitle, { color: theme.colors.text }]}
      >
        {tracker.name}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.summary, { color: theme.colors.text }]}
      >
        {summary.value}
      </Text>
      <Text
        numberOfLines={1}
        style={[typography.caption, { color: theme.colors.textSecondary }]}
      >
        {summary.detail}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        animatedStyle,
      ]}
    >
      {editing ? (
        <>
          <Pressable
            accessibilityLabel={`Delete ${tracker.name}`}
            accessibilityRole="button"
            onPress={onDelete}
            style={[styles.delete, { backgroundColor: theme.colors.danger }]}
          >
            <Icon
              color={theme.colors.onAccent}
              icon={Delete02Icon}
              size={16}
              strokeWidth={2.2}
            />
          </Pressable>
          {copy}
          <View
            accessibilityActions={[
              ...(index > 0 ? [{ name: 'decrement', label: 'Move up' }] : []),
              ...(index < trackerCount - 1
                ? [{ name: 'increment', label: 'Move down' }]
                : []),
            ]}
            accessibilityLabel={`Reorder ${tracker.name}`}
            accessibilityRole="adjustable"
            accessibilityValue={{ text: `${index + 1} of ${trackerCount}` }}
            accessible
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'decrement') {
                onMove(index, Math.max(0, index - 1));
              }
              if (event.nativeEvent.actionName === 'increment') {
                onMove(index, Math.min(trackerCount - 1, index + 1));
              }
            }}
            style={styles.drag}
            {...panResponder.panHandlers}
          >
            <Icon
              color={theme.colors.textTertiary}
              icon={DragDropVerticalIcon}
              size={24}
            />
          </View>
        </>
      ) : (
        <Pressable
          accessibilityLabel={`${tracker.name}, ${summary.value}, ${summary.detail}, ${eventCount} ${eventCount === 1 ? 'entry' : 'entries'}`}
          accessibilityRole="button"
          onLongPress={onEnterEditing}
          onPress={onOpen}
          style={styles.cardPressable}
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor: colorWithAlpha(tracker.color, 0.12),
                borderColor: colorWithAlpha(tracker.color, 0.25),
              },
            ]}
          >
            <TrackerIcon color={tracker.color} name={tracker.icon} size={27} />
          </View>
          {copy}
          <Icon
            color={theme.colors.textTertiary}
            icon={ArrowRight01Icon}
            size={21}
          />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  headerButtonText: { fontSize: 17, fontWeight: '500' },
  card: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 126,
    padding: spacing.md,
  },
  cardPressable: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  delete: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  copy: { flex: 1, gap: spacing.xxs },
  summary: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  drag: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 38,
  },
  newCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 74,
    paddingHorizontal: spacing.md,
  },
  newIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
