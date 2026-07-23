import {
  Add01Icon,
  Chart02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { useMinimizeOnScroll } from '../../src/components/glass-tabs';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '../../src/components/EmptyState';
import { Field, PrimaryButton } from '../../src/components/Form';
import { GlassButton } from '../../src/components/GlassButton';
import { Icon } from '../../src/components/Icon';
import { ScreenHeader } from '../../src/components/Screen';
import { Sheet } from '../../src/components/Sheet';
import { radius, spacing, type as typography } from '../../src/design/theme';
import { useTracky, type Tracker } from '../../src/store/TrackyProvider';

export default function TrackScreen() {
  const { createTracker, events, theme, trackers } = useTracky();
  const onScroll = useMinimizeOnScroll();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    createTracker(name, unit);
    setName('');
    setUnit('');
    setSheetOpen(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Track"
          trailing={
            <GlassButton
              accessibilityLabel="Create tracker"
              compact
              icon={Add01Icon}
              onPress={() => setSheetOpen(true)}
              prominent
            />
          }
        />
        <View style={styles.inner}>
          {trackers.length ? (
            <View style={styles.list}>
              {trackers.map((tracker) => (
                <TrackerRow
                  eventCount={
                    events.filter((event) => event.trackerId === tracker.id).length
                  }
                  key={tracker.id}
                  tracker={tracker}
                />
              ))}
            </View>
          ) : (
            <>
              <EmptyState icon={Chart02Icon} title="No trackers yet" />
              <View style={styles.bottomAction}>
                <GlassButton
                  accessibilityLabel="Create your first tracker"
                  icon={Add01Icon}
                  label="Create tracker"
                  onPress={() => setSheetOpen(true)}
                  prominent
                />
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>

      <Sheet
        onClose={() => setSheetOpen(false)}
        title="New tracker"
        visible={sheetOpen}
      >
        <Field
          autoCapitalize="sentences"
          autoFocus
          label="Name"
          onChangeText={setName}
          placeholder="Coffee, water, mood…"
          value={name}
        />
        <Field
          autoCapitalize="none"
          label="Default unit (optional)"
          onChangeText={setUnit}
          onSubmitEditing={submit}
          placeholder="ml, cups, mg…"
          returnKeyType="done"
          value={unit}
        />
        <PrimaryButton
          disabled={!name.trim()}
          label="Create tracker"
          onPress={submit}
        />
      </Sheet>
    </View>
  );
}

function TrackerRow({
  eventCount,
  tracker,
}: {
  eventCount: number;
  tracker: Tracker;
}) {
  const { deleteTracker, theme } = useTracky();

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${tracker.name}?`,
      eventCount
        ? `This also deletes ${eventCount} logged ${eventCount === 1 ? 'event' : 'events'}.`
        : 'This tracker has no logged events.',
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
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon color={theme.colors.accent} icon={Chart02Icon} size={22} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
          {tracker.name}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
          {tracker.unit ? `Amount in ${tracker.unit}` : 'Count or note'} ·{' '}
          {eventCount} {eventCount === 1 ? 'entry' : 'entries'}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Delete ${tracker.name}`}
        accessibilityRole="button"
        hitSlop={10}
        onPress={confirmDelete}
        style={({ pressed }) => [
          styles.delete,
          {
            backgroundColor: theme.colors.dangerSoft,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Icon color={theme.colors.danger} icon={Delete02Icon} size={19} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 150 },
  inner: { paddingHorizontal: spacing.lg },
  list: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  rowCopy: { flex: 1, gap: spacing.xxs },
  delete: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  bottomAction: { alignItems: 'center', paddingTop: spacing.xl },
});
