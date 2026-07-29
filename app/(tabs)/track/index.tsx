import {
  Add01Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '../../../src/components/Icon';
import { TrackerIcon } from '../../../src/components/tracking/TrackerIcon';
import {
  RING_SIZE,
  ringIconSize,
} from '../../../src/components/tracking/progressRing';
import { TrackerProgressRing } from '../../../src/components/tracking/TrackerProgressRing';
import {
  radius,
  resolveHabitColor,
  spacing,
  tabBarInset,
  type as typography,
  type Theme,
} from '../../../src/design/theme';
import type { TrackedEvent, Tracker } from '../../../src/domain/models';
import { trackerGoalStatus } from '../../../src/domain/tracking';
import { useTimeframeNow } from '../../../src/hooks/useTimeframeNow';
import { useTrackerEditorSession } from '../../../src/store/TrackerEditorSession';
import { useTracky } from '../../../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../../../src/utils/haptics';

function trackerStatus(
  tracker: Tracker,
  events: TrackedEvent[],
  now: Date,
) {
  return trackerGoalStatus(tracker, events, now);
}

export default function TodayScreen() {
  const router = useRouter();
  useTimeframeNow();
  const trackerEditor = useTrackerEditorSession();
  const { events, theme, toggleTrackerCheckIn, trackers } = useTracky();

  const orderedTrackers = useMemo(() => trackers, [trackers]);

  const newTracker = () => {
    tapHaptic();
    trackerEditor.begin();
    router.push('/tracker-editor');
  };

  const openTracker = (tracker: Tracker) => {
    tapHaptic();
    router.navigate({
      pathname: '/tracker-detail',
      params: { trackerId: tracker.id },
    });
  };

  const toggleCompletion = (tracker: Tracker) => {
    const result = toggleTrackerCheckIn(tracker.id);
    if (result === 'completed') successHaptic();
    else if (result === 'uncompleted' || result === 'logged') tapHaptic();
  };

  return (
    // The ScrollView has to be the screen's first child or the native large
    // title will not collapse on scroll.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarInset + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack.Screen options={{ title: 'Today' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Create a new tracker"
          icon="plus"
          onPress={newTracker}
        />
      </Stack.Toolbar>

      {orderedTrackers.length ? (
        <View style={styles.trackerList}>
          {orderedTrackers.map((tracker) => {
            const status = trackerStatus(tracker, events, new Date());
            return (
              <TrackerRow
                key={tracker.id}
                onOpen={() => openTracker(tracker)}
                onQuickLog={() => toggleCompletion(tracker)}
                status={status}
                theme={theme}
                tracker={tracker}
              />
            );
          })}
        </View>
      ) : (
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
            Nothing to track yet
          </Text>
          <Text
            style={[
              typography.subheadline,
              styles.emptyCopy,
              { color: theme.colors.textSecondary },
            ]}
          >
            Add a tracker for anything you want to remember or do regularly.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={newTracker}
            style={[
              styles.emptyButton,
              { backgroundColor: theme.colors.accent },
            ]}
          >
            <Text
              style={[typography.headline, { color: theme.colors.onAccent }]}
            >
              New tracker
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function TrackerRow({
  onOpen,
  onQuickLog,
  status,
  theme,
  tracker,
}: {
  onOpen: () => void;
  onQuickLog: () => void;
  status: {
    complete: boolean;
    count: number;
    detail: string;
    targetCount: number;
  };
  theme: Theme;
  tracker: Tracker;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityHint="Opens tracker details"
        accessibilityLabel={`${tracker.name}, ${status.detail}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.rowMain,
          pressed && { opacity: 0.62 },
        ]}
      >
        <TrackerProgressRing
          color={resolveHabitColor(tracker.color, theme.dark)}
          count={status.count}
          size={RING_SIZE.row}
          target={status.targetCount}
          trackColor={theme.colors.separator}
        >
          <TrackerIcon
            color={theme.colors.text}
            name={tracker.icon}
            size={ringIconSize(RING_SIZE.row)}
          />
        </TrackerProgressRing>
        <View style={styles.rowCopy}>
          <Text
            numberOfLines={1}
            style={[typography.headline, { color: theme.colors.text }]}
          >
            {tracker.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              typography.subheadline,
              { color: theme.colors.textSecondary },
            ]}
          >
            {status.detail}
          </Text>
        </View>
        <Icon
          color={theme.colors.textTertiary}
          icon={ArrowRight01Icon}
          size={17}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={
          status.complete
            ? `Undo the latest ${tracker.name} check-in`
            : `Check in ${tracker.name}`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: status.complete }}
        hitSlop={8}
        onPress={onQuickLog}
        style={({ pressed }) => [
          styles.quickAction,
          {
            backgroundColor: status.complete
              ? theme.colors.accent
              : pressed
                ? theme.colors.surfaceMuted
                : theme.colors.background,
            borderColor: status.complete
              ? theme.colors.accent
              : theme.colors.border,
          },
        ]}
      >
        <Icon
          color={status.complete ? theme.colors.onAccent : theme.colors.text}
          icon={status.complete ? Tick02Icon : Add01Icon}
          size={22}
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  trackerList: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 92,
    overflow: 'hidden',
    paddingRight: spacing.md,
  },
  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 92,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowCopy: { flex: 1, gap: spacing.xxs },
  quickAction: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  empty: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    maxWidth: 300,
    paddingTop: 96,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 56,
  },
  emptyCopy: { textAlign: 'center' },
  emptyButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
});
