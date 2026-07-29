import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
import { trackerGoalStatus } from '../src/domain/tracking';
import { useTimeframeNow } from '../src/hooks/useTimeframeNow';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

export default function LogTrackerSheet() {
  const router = useRouter();
  useTimeframeNow();
  const { events, theme, toggleTrackerCheckIn, trackers } = useTracky();

  const toggleCompletion = (trackerId: string) => {
    const result = toggleTrackerCheckIn(trackerId);
    if (result === 'completed') successHaptic();
    else if (result === 'uncompleted' || result === 'logged') tapHaptic();
  };

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: 'Check In' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close check in"
          icon="xmark"
          onPress={() => {
            tapHaptic();
            router.back();
          }}
          separateBackground
        />
      </Stack.Toolbar>

      <NativeSheetScrollView
        contentContainerStyle={styles.content}
      >
        <SectionHeader>Choose a tracker</SectionHeader>
        {trackers.length ? (
          <View
            style={[
              styles.trackerGroup,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {trackers.map((tracker, index) => {
              const status = trackerGoalStatus(tracker, events, new Date());

              return (
                <Pressable
                  accessibilityLabel={
                    status.complete
                      ? `Undo the latest ${tracker.name} check-in`
                      : `Check in ${tracker.name}, ${status.detail}`
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: status.complete }}
                  key={tracker.id}
                  onPress={() => toggleCompletion(tracker.id)}
                  style={({ pressed }) => [
                    styles.trackerRow,
                    index > 0 && {
                      borderTopColor: theme.colors.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { backgroundColor: theme.colors.surfaceMuted },
                  ]}
                >
                  <View
                    style={[
                      styles.trackerIcon,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <TrackerIcon
                      color={theme.colors.text}
                      name={tracker.icon}
                      size={21}
                    />
                  </View>
                  <View style={styles.trackerCopy}>
                    <Text
                      style={[
                        typography.headline,
                        { color: theme.colors.text },
                      ]}
                    >
                      {tracker.name}
                    </Text>
                    <Text
                      style={[
                        typography.footnote,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {status.detail}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: status.complete
                          ? resolveHabitColor(tracker.color, theme.dark)
                          : theme.colors.background,
                        borderColor: status.complete
                          ? resolveHabitColor(tracker.color, theme.dark)
                          : theme.colors.border,
                      },
                    ]}
                  >
                    {status.complete ? (
                      <Icon
                        color={theme.colors.onAccent}
                        icon={Tick02Icon}
                        size={18}
                        strokeWidth={2}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
            Create a tracker before checking in.
          </Text>
        )}
      </NativeSheetScrollView>
    </NativeSheetScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  trackerGroup: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  trackerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  trackerIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  trackerCopy: { flex: 1, gap: spacing.xxs },
  check: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
});
