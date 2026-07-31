import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { NativeSheetScreen } from '../src/components/NativeSheetScreen';
import { TrackerEditorForm } from '../src/components/tracking/TrackerEditorSheet';
import { spacing, type as typography } from '../src/design/theme';
import { simplifiedTrackerDraft } from '../src/domain/trackerDraft';
import { requestPlanningNotificationPermission } from '../src/notifications/PlanningNotificationRuntime';
import { useTrackerEditorSession } from '../src/store/TrackerEditorSession';
import { useTracky } from '../src/store/TrackyProvider';
import { successHaptic, tapHaptic } from '../src/utils/haptics';

export default function TrackerEditorScreen() {
  const router = useRouter();
  const { clear, session, updateDraft } = useTrackerEditorSession();
  const { createTracker, theme, updateTracker } = useTracky();

  const close = () => {
    tapHaptic();
    clear();
    router.back();
  };

  if (!session) {
    return (
      <NativeSheetScreen style={styles.missing}>
        <Stack.Screen options={{ title: 'Habit' }} />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Close habit editor"
            icon="xmark"
            onPress={() => router.back()}
            separateBackground
          />
        </Stack.Toolbar>
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          The habit editor is no longer available.
        </Text>
      </NativeSheetScreen>
    );
  }

  const save = async () => {
    if (!session.draft.name.trim()) return;
    const draft = simplifiedTrackerDraft(session.draft);
    if (draft.schedule.time) {
      await requestPlanningNotificationPermission();
    }
    if (session.trackerId) {
      updateTracker(session.trackerId, draft);
    } else {
      createTracker(draft);
    }
    successHaptic();
    clear();
    router.back();
  };

  return (
    <NativeSheetScreen>
      <Stack.Screen
        options={{
          title: session.trackerId ? 'Edit Habit' : 'New Habit',
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel habit changes"
          onPress={close}
          separateBackground
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={session.trackerId ? 'Save habit' : 'Add habit'}
          disabled={!session.draft.name.trim()}
          onPress={save}
          separateBackground
        >
          {session.trackerId ? 'Save' : 'Add'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <TrackerEditorForm
        draft={session.draft}
        onChooseIcon={() => {
          tapHaptic();
          router.push('/tracker-icon-picker');
        }}
        onChooseStartDate={() => {
          tapHaptic();
          router.push('/tracker-start-date');
        }}
        onDraftChange={updateDraft}
      />
    </NativeSheetScreen>
  );
}

const styles = StyleSheet.create({
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
