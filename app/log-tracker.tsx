import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '../src/components/Icon';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import { radius, spacing, type as typography } from '../src/design/theme';
import { eventsInTimeframe } from '../src/domain/tracking';
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
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                tapHaptic();
                router.back();
              }}
              style={styles.headerIcon}
            >
              <Icon
                color={theme.colors.text}
                icon={Cancel01Icon}
                size={21}
              />
            </Pressable>
          ),
          title: 'Check In',
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            typography.label,
            styles.sectionTitle,
            { color: theme.colors.textSecondary },
          ]}
        >
          CHOOSE A TRACKER
        </Text>
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
              const done = eventsInTimeframe(
                events.filter((event) => event.trackerId === tracker.id),
                'today',
                new Date(),
              ).length > 0;

              return (
                <Pressable
                  accessibilityLabel={
                    done
                      ? `Mark ${tracker.name} not complete for today`
                      : `Mark ${tracker.name} complete for today`
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: done }}
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
                        backgroundColor: theme.colors.backgroundRaised,
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
                        typography.cardTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {tracker.name}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {done ? 'Done today' : 'Not done'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: done
                          ? theme.colors.accent
                          : theme.colors.backgroundRaised,
                        borderColor: done
                          ? theme.colors.accent
                          : theme.colors.border,
                      },
                    ]}
                  >
                    {done ? (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    gap: spacing.xs,
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.15,
    paddingHorizontal: spacing.xs,
  },
  trackerGroup: {
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
