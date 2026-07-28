import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { NativeSheetScreen } from '../src/components/NativeSheetScreen';
import { TrackerEditorForm } from '../src/components/tracking/TrackerEditorSheet';
import { spacing, type as typography } from '../src/design/theme';
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
        <Stack.Screen options={{ title: 'Tracker' }} />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Close tracker editor"
            icon="xmark"
            onPress={() => router.back()}
            separateBackground
          />
        </Stack.Toolbar>
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          The tracker editor is no longer available.
        </Text>
      </NativeSheetScreen>
    );
  }

  const save = () => {
    if (!session.draft.name.trim()) return;
    if (session.trackerId) {
      updateTracker(session.trackerId, session.draft);
    } else {
      createTracker(session.draft);
    }
    successHaptic();
    clear();
    router.back();
  };

  return (
    <NativeSheetScreen>
      <Stack.Screen
        options={{
          title: session.trackerId ? 'Edit Tracker' : 'New Tracker',
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel tracker changes"
          onPress={close}
          separateBackground
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={session.trackerId ? 'Save tracker' : 'Add tracker'}
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
