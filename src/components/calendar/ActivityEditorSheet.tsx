import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, type as typography } from '../../design/theme';
import type { ActivityBlock } from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { PrimaryButton } from '../Form';
import { NativeTimePicker } from '../NativeControls';
import { Sheet } from '../Sheet';

type ActivityEditorSheetProps = {
  activity: ActivityBlock | null;
  onClose: () => void;
};

export function ActivityEditorSheet({
  activity,
  onClose,
}: ActivityEditorSheetProps) {
  const { theme, updateActivityTimes } = useTracky();
  const [startValue, setStartValue] = useState<Date | null>(null);
  const [endValue, setEndValue] = useState<Date | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    setStartValue(activity ? new Date(activity.startedAt) : null);
    setEndValue(
      activity?.endedAt ? new Date(activity.endedAt) : null,
    );
    setTimeError(null);
  }, [activity]);

  const submit = () => {
    if (!activity || !startValue) return;
    if (!Number.isFinite(startValue.getTime())) {
      setTimeError('Choose a valid start time.');
      return;
    }
    if (activity.endedAt && !endValue) {
      setTimeError('Ended activities need an end time.');
      return;
    }
    if (endValue && endValue <= startValue) {
      setTimeError('End time must be after start time.');
      return;
    }
    if (!activity.endedAt && endValue) {
      setTimeError('The current activity stays open until you switch or stop it.');
      return;
    }
    if (!updateActivityTimes(activity.id, startValue, endValue)) {
      setTimeError('These times overlap another activity or cannot be saved.');
      return;
    }
    onClose();
  };

  return (
    <Sheet
      onClose={onClose}
      title={activity ? `Edit ${activity.name}` : 'Edit activity'}
      visible={!!activity}
    >
      {startValue ? (
        <NativeTimePicker
          label="Start"
          onChange={(value) => {
            setStartValue(value);
            setTimeError(null);
          }}
          value={startValue}
        />
      ) : null}
      {endValue ? (
        <NativeTimePicker
          label="End"
          onChange={(value) => {
            setEndValue(value);
            setTimeError(null);
          }}
          value={endValue}
        />
      ) : (
        <View
          style={[
            styles.currentEnd,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[typography.body, { color: theme.colors.text }]}>
            End
          </Text>
          <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
            When you switch or stop
          </Text>
        </View>
      )}
      {timeError ? (
        <Text
          accessibilityRole="alert"
          style={[typography.footnote, { color: theme.colors.danger }]}
        >
          {timeError}
        </Text>
      ) : null}
      <PrimaryButton label="Save times" onPress={submit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  currentEnd: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
});
