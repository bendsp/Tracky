import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import { TrackerStartDatePicker } from '../src/components/tracking/TrackerStartDateSheet';
import { spacing, type as typography } from '../src/design/theme';
import { useTrackerEditorSession } from '../src/store/TrackerEditorSession';
import { useTracky } from '../src/store/TrackyProvider';
import { tapHaptic } from '../src/utils/haptics';

export default function TrackerStartDateScreen() {
  const router = useRouter();
  const { session, updateDraft } = useTrackerEditorSession();
  const { theme } = useTracky();
  const [pendingDate, setPendingDate] = useState(
    session?.draft.goal.startDate,
  );

  if (!session) {
    return (
      <NativeSheetScreen style={styles.missing}>
        <Stack.Screen options={{ title: 'Start Date' }} />
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          The habit editor is no longer available.
        </Text>
      </NativeSheetScreen>
    );
  }

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: 'Start Date' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close start date picker"
          icon="xmark"
          onPress={() => {
            tapHaptic();
            router.back();
          }}
          separateBackground
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Choose start date"
          disabled={!pendingDate}
          onPress={() => {
            if (!pendingDate) return;
            updateDraft((current) => ({
              ...current,
              goal: { ...current.goal, startDate: pendingDate },
              schedule: { ...current.schedule, startDate: pendingDate },
            }));
            tapHaptic();
            router.back();
          }}
          separateBackground
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <NativeSheetScrollView>
        <TrackerStartDatePicker
          onSelect={setPendingDate}
          selected={pendingDate ?? session.draft.goal.startDate}
        />
      </NativeSheetScrollView>
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
