import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../src/components/Icon';
import { SectionHeader } from '../../../src/components/Screen';
import { TrackerIcon } from '../../../src/components/tracking/TrackerIcon';
import {
  radius,
  spacing,
  tabBarInset,
  type as typography,
} from '../../../src/design/theme';
import { scheduleDescription } from '../../../src/domain/planning';
import { useTrackerEditorSession } from '../../../src/store/TrackerEditorSession';
import { useTracky } from '../../../src/store/TrackyProvider';
import { tapHaptic } from '../../../src/utils/haptics';

export default function LibraryScreen() {
  const router = useRouter();
  const trackerEditor = useTrackerEditorSession();
  const { routines, theme, trackers } = useTracky();

  const newTracker = () => {
    tapHaptic();
    trackerEditor.begin();
    router.push('/tracker-editor');
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarInset + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack.Screen options={{ title: 'Library' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" title="New">
          <Stack.Toolbar.MenuAction icon="checkmark.circle" onPress={newTracker}>
            New Habit
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="list.bullet.rectangle"
            onPress={() => router.push('/routine-editor')}
          >
            New Routine
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      {trackers.length ? (
        <View>
          <SectionHeader>Habits</SectionHeader>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {trackers.map((tracker, index) => (
              <LibraryRow
                detail={`${tracker.goal.targetCount} per ${tracker.goal.period}${tracker.schedule.time ? ` · ${tracker.schedule.time}` : ''}`}
                divided={index > 0}
                icon={<TrackerIcon color={theme.colors.text} name={tracker.icon} size={23} />}
                key={tracker.id}
                onPress={() =>
                  router.push({
                    pathname: '/tracker-detail',
                    params: { trackerId: tracker.id },
                  })
                }
                theme={theme}
                title={tracker.name}
              />
            ))}
          </View>
        </View>
      ) : null}

      {routines.length ? (
        <View>
          <SectionHeader>Routines</SectionHeader>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {routines.map((routine, index) => (
              <LibraryRow
                detail={`${routine.steps.length} ${routine.steps.length === 1 ? 'step' : 'steps'} · ${scheduleDescription(routine.schedule)}`}
                divided={index > 0}
                icon={<TrackerIcon color={theme.colors.text} name={routine.icon} size={23} />}
                key={routine.id}
                onPress={() =>
                  router.push({
                    pathname: '/routine-editor',
                    params: { routineId: routine.id },
                  })
                }
                theme={theme}
                title={routine.name}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!trackers.length && !routines.length ? (
        <View style={styles.empty}>
          <Text style={[typography.title3, { color: theme.colors.text }]}>Your standing commitments live here</Text>
          <Text
            style={[
              typography.body,
              styles.emptyCopy,
              { color: theme.colors.textSecondary },
            ]}
          >
            Add a habit for something you want to repeat, or a routine for a sequence you don’t want to hold in your head.
          </Text>
          <View style={styles.emptyActions}>
            <Pressable
              accessibilityRole="button"
              onPress={newTracker}
              style={({ pressed }) => [
                styles.emptyAction,
                {
                  backgroundColor: theme.colors.accent,
                  opacity: pressed ? 0.62 : 1,
                },
              ]}
            >
              <Text style={[typography.headline, { color: theme.colors.onAccent }]}>New Habit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/routine-editor')}
              style={({ pressed }) => [
                styles.emptyAction,
                {
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.62 : 1,
                },
              ]}
            >
              <Text style={[typography.headline, { color: theme.colors.text }]}>New Routine</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function LibraryRow({
  detail,
  divided,
  icon,
  onPress,
  theme,
  title,
}: {
  detail: string;
  divided: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  theme: ReturnType<typeof useTracky>['theme'];
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divided && {
          borderTopColor: theme.colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        { opacity: pressed ? 0.58 : 1 },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {icon}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[typography.headline, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[typography.footnote, { color: theme.colors.textSecondary }]}>
          {detail}
        </Text>
      </View>
      <Icon color={theme.colors.textTertiary} icon={ArrowRight01Icon} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: { gap: spacing.sm, paddingHorizontal: spacing.md },
  copy: { flex: 1, gap: spacing.xxs },
  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl },
  emptyAction: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  emptyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  emptyCopy: { marginTop: spacing.xs, maxWidth: 340, textAlign: 'center' },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
