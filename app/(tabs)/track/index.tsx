import { Add01Icon } from '@hugeicons/core-free-icons';
import { ListItem } from '@expo/ui';
import {
  Host,
  HStack,
  Image as NativeImage,
  List,
  Spacer as NativeSpacer,
  Text as NativeText,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel as nativeAccessibilityLabel,
  background,
  deleteDisabled,
  environment,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listStyle,
  moveDisabled,
  onLongPressGesture,
  onTapGesture,
  padding,
  scrollContentBackground,
  shapes,
  strokeBorder,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../src/components/Icon';
import { TrackerEditorSheet } from '../../../src/components/tracking/TrackerEditorSheet';
import { TrackerIcon } from '../../../src/components/tracking/TrackerIcon';
import {
  colorWithAlpha,
  radius,
  spacing,
  type Theme,
} from '../../../src/design/theme';
import type { TrackedEvent, Tracker } from '../../../src/domain/models';
import { trackerSummary } from '../../../src/domain/tracking';
import { useTimeframeNow } from '../../../src/hooks/useTimeframeNow';
import { useTracky } from '../../../src/store/TrackyProvider';

export default function TrackScreen() {
  const router = useRouter();
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

  const moveTrackers = (sourceIndices: number[], destination: number) => {
    const source = sourceIndices[0];
    if (source === undefined) return;

    const ordered = [...trackers];
    const [moved] = ordered.splice(source, 1);
    if (!moved) return;

    const adjustedDestination = source < destination ? destination - 1 : destination;
    ordered.splice(
      Math.max(0, Math.min(adjustedDestination, ordered.length)),
      0,
      moved,
    );
    reorderTrackers(ordered.map((tracker) => tracker.id));
    Haptics.selectionAsync().catch(() => undefined);
  };

  const deleteTrackers = (indices: number[]) => {
    const tracker = trackers[indices[0]];
    if (tracker) confirmDelete(tracker);
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
      <Host style={styles.listHost}>
        <List
          modifiers={[
            listStyle('plain'),
            scrollContentBackground('hidden'),
            background(theme.colors.background),
            environment({
              key: 'editMode',
              value: editing ? 'active' : 'inactive',
            }),
          ]}
        >
          {trackers.length ? null : (
            <NativeText
              modifiers={[
                foregroundStyle(theme.colors.textSecondary),
                padding({ all: spacing.lg }),
                listRowBackground(theme.colors.background),
                listRowSeparator('hidden'),
              ]}
            >
              Make a tracker for anything you want to remember.
            </NativeText>
          )}
          <List.ForEach onDelete={deleteTrackers} onMove={moveTrackers}>
            {trackers.map((tracker) => (
              <TrackerListItem
                editing={editing}
                eventCount={
                  events.filter((event) => event.trackerId === tracker.id).length
                }
                events={events}
                key={tracker.id}
                now={summaryNow}
                onEnterEditing={enterEditing}
                onOpen={() => {
                  if (Date.now() - longPressEditStartedAt.current < 1_000) return;
                  router.push(`/track/${tracker.id}`);
                }}
                theme={theme}
                tracker={tracker}
              />
            ))}
          </List.ForEach>
          <ListItem
            leading={
              <View
                style={[
                  styles.newIcon,
                  { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Icon color={theme.colors.accent} icon={Add01Icon} size={21} />
              </View>
            }
            modifiers={[
              nativeAccessibilityLabel('Create a new tracker'),
              listRowInsets({
                top: spacing.xs,
                leading: spacing.lg,
                bottom: spacing.xs,
                trailing: spacing.lg,
              }),
              listRowSeparator('hidden'),
              listRowBackground(theme.colors.background),
              padding({ horizontal: spacing.md, vertical: spacing.md }),
              background(
                theme.colors.surface,
                shapes.roundedRectangle({ cornerRadius: radius.lg }),
              ),
              strokeBorder({
                color: theme.colors.border,
                shape: 'roundedRectangle',
                cornerRadius: radius.lg,
                style: { lineWidth: 1, dash: [5, 4] },
              }),
            ]}
            onPress={() => setEditorOpen(true)}
          >
            <NativeText
              modifiers={[
                font({ textStyle: 'headline', weight: 'semibold' }),
                foregroundStyle(theme.colors.text),
              ]}
            >
              New
            </NativeText>
          </ListItem>
          <NativeSpacer
            modifiers={[
              frame({ height: 112 }),
              listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
              listRowBackground(theme.colors.background),
              listRowSeparator('hidden'),
            ]}
          />
        </List>
      </Host>
      <TrackerEditorSheet
        onClose={() => setEditorOpen(false)}
        visible={editorOpen}
      />
    </View>
  );
}

function TrackerListItem({
  editing,
  eventCount,
  events,
  now,
  onEnterEditing,
  onOpen,
  theme,
  tracker,
}: {
  editing: boolean;
  eventCount: number;
  events: TrackedEvent[];
  now: Date;
  onEnterEditing: () => void;
  onOpen: () => void;
  theme: Theme;
  tracker: Tracker;
}) {
  const summary = trackerSummary(tracker, events, now);

  return (
    <ListItem
      leading={
        <View
          style={[
            styles.icon,
            {
              backgroundColor: colorWithAlpha(tracker.color, 0.12),
              borderColor: colorWithAlpha(tracker.color, 0.25),
            },
          ]}
        >
          <TrackerIcon color={tracker.color} name={tracker.icon} size={25} />
        </View>
      }
      modifiers={[
        tag(tracker.id),
        nativeAccessibilityLabel(
          `${tracker.name}, ${summary.value}, ${summary.detail}, ${eventCount} ${eventCount === 1 ? 'entry' : 'entries'}`,
        ),
        listRowInsets({
          top: spacing.xs,
          leading: spacing.lg,
          bottom: spacing.xs,
          trailing: spacing.lg,
        }),
        listRowSeparator('hidden'),
        listRowBackground(theme.colors.background),
        padding({ horizontal: spacing.md, vertical: spacing.md }),
        background(
          theme.colors.surface,
          shapes.roundedRectangle({ cornerRadius: radius.lg }),
        ),
        strokeBorder({
          color: theme.colors.border,
          shape: 'roundedRectangle',
          cornerRadius: radius.lg,
          style: { lineWidth: 1 },
        }),
        deleteDisabled(!editing),
        moveDisabled(!editing),
        onLongPressGesture(onEnterEditing, 0.45),
        onTapGesture(() => {
          if (!editing) onOpen();
        }),
      ]}
      supportingText={
        editing ? undefined : (
          <NativeText
            modifiers={[
              font({ textStyle: 'caption', weight: 'medium' }),
              foregroundStyle(theme.colors.textSecondary),
            ]}
          >
            {summary.detail}
          </NativeText>
        )
      }
      trailing={
        editing ? undefined : (
          <HStack spacing={spacing.xs}>
            <NativeText
              modifiers={[
                font({ textStyle: 'title3', weight: 'bold' }),
                foregroundStyle(theme.colors.text),
              ]}
            >
              {summary.value}
            </NativeText>
            <NativeImage
              color={theme.colors.textTertiary}
              size={14}
              systemName="chevron.right"
            />
          </HStack>
        )
      }
    >
      <NativeText
        modifiers={[
          font({ textStyle: 'headline', weight: 'semibold' }),
          foregroundStyle(theme.colors.text),
        ]}
      >
        {tracker.name}
      </NativeText>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listHost: { flex: 1 },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  headerButtonText: { fontSize: 17, fontWeight: '500' },
  icon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  newIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
