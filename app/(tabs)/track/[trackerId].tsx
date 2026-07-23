import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../../src/components/Icon';
import { Sheet } from '../../../src/components/Sheet';
import { TrackerEditorSheet } from '../../../src/components/tracking/TrackerEditorSheet';
import { TrackerEntryForm } from '../../../src/components/tracking/TrackerEntryForm';
import { TrackerIcon } from '../../../src/components/tracking/TrackerIcon';
import {
  colorWithAlpha,
  radius,
  spacing,
  type as typography,
} from '../../../src/design/theme';
import type { TrackedEvent, Tracker } from '../../../src/domain/models';
import {
  eventTitle,
  formatFieldValue,
  groupEventsByDate,
  trackerSummary,
} from '../../../src/domain/tracking';
import { useTimeframeNow } from '../../../src/hooks/useTimeframeNow';
import { useTracky } from '../../../src/store/TrackyProvider';

function dateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (candidate: Date, reference: Date) =>
    candidate.getFullYear() === reference.getFullYear() &&
    candidate.getMonth() === reference.getMonth() &&
    candidate.getDate() === reference.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function secondaryValue(tracker: Tracker, event: TrackedEvent) {
  const populated = tracker.fields.flatMap((field) => {
    const value = formatFieldValue(field, event.values[field.id]);
    return value ? [{ field, value }] : [];
  });
  return populated.length > 1 ? populated[populated.length - 1].value : null;
}

export default function TrackerHistoryScreen() {
  const { trackerId } = useLocalSearchParams<{ trackerId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const summaryNow = useTimeframeNow();
  const {
    deleteEvent,
    events,
    theme,
    trackers,
    updateEvent,
  } = useTracky();
  const tracker = trackers.find((candidate) => candidate.id === trackerId);
  const trackerEvents = useMemo(
    () => events.filter((event) => event.trackerId === trackerId),
    [events, trackerId],
  );
  const groups = useMemo(() => groupEventsByDate(trackerEvents), [trackerEvents]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const selectedEvent =
    trackerEvents.find((event) => event.id === selectedEventId) ?? null;

  if (!tracker) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Tracker' }} />
        <Text style={[typography.section, { color: theme.colors.text }]}>
          Tracker not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[typography.label, { color: theme.colors.accent }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const summary = trackerSummary(tracker, events, summaryNow);

  const confirmDeleteEntry = () => {
    if (!selectedEvent) return;
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEvent(selectedEvent.id);
          setSelectedEventId(null);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityLabel={`Edit ${tracker.name}`}
              accessibilityRole="button"
              onPress={() => setEditorOpen(true)}
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>
                Edit
              </Text>
            </Pressable>
          ),
          title: tracker.name,
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
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: colorWithAlpha(tracker.color, 0.13) },
            ]}
          >
            <TrackerIcon color={tracker.color} name={tracker.icon} size={32} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroValue, { color: theme.colors.text }]}>
              {summary.value}
            </Text>
            <Text
              style={[typography.body, { color: theme.colors.textSecondary }]}
            >
              {summary.detail}
            </Text>
          </View>
        </View>

        {groups.length ? (
          groups.map((group) => (
            <View key={group.dateKey} style={styles.group}>
              <View style={styles.groupHeading}>
                <Text
                  style={[
                    typography.eyebrow,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {dateLabel(group.dateKey).toLocaleUpperCase()}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {group.events.length}{' '}
                  {group.events.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>
              <View
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {group.events.map((event, index) => {
                  const trailing = secondaryValue(tracker, event);
                  return (
                    <Pressable
                      accessibilityLabel={`Edit entry from ${timeLabel(event.occurredAt)}`}
                      accessibilityRole="button"
                      key={event.id}
                      onPress={() => setSelectedEventId(event.id)}
                      style={[
                        styles.entry,
                        index > 0 && {
                          borderTopColor: theme.colors.separator,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={styles.entryCopy}>
                        <Text
                          numberOfLines={1}
                          style={[typography.cardTitle, { color: theme.colors.text }]}
                        >
                          {eventTitle(tracker, event)}
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {timeLabel(event.occurredAt)}
                          {event.note ? ` · ${event.note}` : ''}
                        </Text>
                      </View>
                      {trailing ? (
                        <Text style={[typography.body, { color: theme.colors.text }]}>
                          {trailing}
                        </Text>
                      ) : null}
                      <Icon
                        color={theme.colors.textTertiary}
                        icon={ArrowRight01Icon}
                        size={18}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={[typography.section, { color: theme.colors.text }]}>
              No entries yet
            </Text>
            <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
              Use the universal + to log the first one.
            </Text>
          </View>
        )}
      </ScrollView>

      <Sheet
        onClose={() => setSelectedEventId(null)}
        size="large"
        title="Edit entry"
        visible={!!selectedEvent}
      >
        {selectedEvent ? (
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.formContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.formViewport}
          >
            <TrackerEntryForm
              event={selectedEvent}
              onDelete={confirmDeleteEntry}
              onSubmit={(draft) => {
                updateEvent(selectedEvent.id, draft);
                setSelectedEventId(null);
              }}
              submitLabel="Save entry"
              tracker={tracker}
            />
          </ScrollView>
        ) : null}
      </Sheet>
      <TrackerEditorSheet
        onClose={() => setEditorOpen(false)}
        tracker={tracker}
        visible={editorOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.xxl, padding: spacing.lg },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  headerButtonText: { fontSize: 17, fontWeight: '500' },
  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  heroCopy: { flex: 1, gap: spacing.xxs },
  heroValue: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  group: { gap: spacing.sm },
  groupHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  entry: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
  },
  entryCopy: { flex: 1, gap: spacing.xxs },
  empty: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxl },
  formViewport: { maxHeight: 620 },
  formContent: { paddingBottom: spacing.lg },
  missing: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
