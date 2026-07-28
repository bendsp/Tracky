import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { NativeSheetScreen } from '../src/components/NativeSheetScreen';
import { TrackerIconPicker } from '../src/components/tracking/TrackerIconPickerSheet';
import { spacing, type as typography } from '../src/design/theme';
import { useTrackerEditorSession } from '../src/store/TrackerEditorSession';
import { useTracky } from '../src/store/TrackyProvider';
import { tapHaptic } from '../src/utils/haptics';

export default function TrackerIconPickerScreen() {
  const router = useRouter();
  const { session, updateDraft } = useTrackerEditorSession();
  const { theme } = useTracky();
  const [pendingIcon, setPendingIcon] = useState(session?.draft.icon);

  if (!session) {
    return (
      <NativeSheetScreen style={styles.missing}>
        <Stack.Screen options={{ title: 'Choose Icon' }} />
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          The tracker editor is no longer available.
        </Text>
      </NativeSheetScreen>
    );
  }

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: 'Choose Icon' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close icon picker"
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
          accessibilityLabel="Choose icon"
          disabled={!pendingIcon}
          onPress={() => {
            if (!pendingIcon) return;
            updateDraft((current) => ({ ...current, icon: pendingIcon }));
            tapHaptic();
            router.back();
          }}
          separateBackground
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <TrackerIconPicker
        onSelect={setPendingIcon}
        selected={pendingIcon ?? session.draft.icon}
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
