import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../src/components/Icon';
import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import { SectionHeader } from '../src/components/Screen';
import { radius, spacing, type as typography } from '../src/design/theme';
import { localDateAtNoon, unfinishedTasksBefore } from '../src/domain/planning';
import { localDateKey } from '../src/domain/tracking';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic } from '../src/utils/haptics';

export default function EarlierTasksScreen() {
  const router = useRouter();
  const { tasks, theme, toggleTask } = useTracky();
  const today = localDateKey(new Date());
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof tasks>();
    for (const task of unfinishedTasksBefore(tasks, today)) {
      const group = grouped.get(task.scheduledDate) ?? [];
      group.push(task);
      grouped.set(task.scheduledDate, group);
    }
    return [...grouped.entries()].sort(([left], [right]) =>
      right.localeCompare(left),
    );
  }, [tasks, today]);

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: 'Unfinished Earlier' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close unfinished tasks"
          icon="xmark"
          onPress={() => router.back()}
          separateBackground
        />
      </Stack.Toolbar>

      <NativeSheetScrollView contentContainerStyle={styles.content}>
        {groups.map(([date, groupedTasks]) => (
          <View key={date}>
            <SectionHeader>
              {new Intl.DateTimeFormat(undefined, {
                day: 'numeric',
                month: 'long',
                weekday: 'long',
              }).format(localDateAtNoon(date))}
            </SectionHeader>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.groupedSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {groupedTasks.map((task, index) => (
                <View
                  key={task.id}
                  style={[
                    styles.row,
                    index > 0 && {
                      borderTopColor: theme.colors.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityLabel={`Complete ${task.name}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: false }}
                    onPress={() => {
                      if (toggleTask(task.id)) successHaptic();
                    }}
                    style={[
                      styles.checkbox,
                      { borderColor: theme.colors.separator },
                    ]}
                  >
                    <Icon
                      color={theme.colors.textSecondary}
                      icon={Tick02Icon}
                      size={21}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Edit ${task.name}`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/task-editor',
                        params: { taskId: task.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.main,
                      { opacity: pressed ? 0.58 : 1 },
                    ]}
                  >
                    <Text style={[typography.headline, { color: theme.colors.text }]}>
                      {task.name}
                    </Text>
                    {task.time ? (
                      <Text
                        style={[
                          typography.footnote,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {task.time}
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}

        {!groups.length ? (
          <View style={styles.empty}>
            <Text style={[typography.title3, { color: theme.colors.text }]}>Nothing hanging over you</Text>
            <Text
              style={[
                typography.body,
                styles.emptyCopy,
                { color: theme.colors.textSecondary },
              ]}
            >
              Earlier unfinished tasks will appear here without taking over Today.
            </Text>
          </View>
        ) : null}
      </NativeSheetScrollView>
    </NativeSheetScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: { gap: spacing.sm, paddingTop: spacing.sm },
  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl },
  emptyCopy: { marginTop: spacing.xs, textAlign: 'center' },
  main: { flex: 1, gap: spacing.xxs, justifyContent: 'center', minHeight: 68 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
});
