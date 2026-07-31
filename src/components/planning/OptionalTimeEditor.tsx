import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type as typography } from '../../design/theme';
import type { DaySchedule } from '../../domain/models';
import { localTimeOf } from '../../domain/planning';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { NativeTimePicker, NativeToggle } from '../NativeControls';
import { SectionHeader } from '../Screen';

function timeDate(value: DaySchedule['time']) {
  const date = new Date();
  const [hour, minute] = (value ?? '09:00').split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function OptionalTimeEditor({
  onChange,
  time,
}: {
  onChange: (time: DaySchedule['time']) => void;
  time: DaySchedule['time'];
}) {
  const { theme } = useTracky();

  return (
    <View>
      <SectionHeader>Time</SectionHeader>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.groupedSurface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Time</Text>
          <NativeToggle
            label="Set a time"
            onChange={(enabled) => {
              selectionHaptic();
              onChange(enabled ? time ?? '09:00' : null);
            }}
            value={time !== null}
          />
        </View>
        {time ? (
          <>
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <View style={styles.row}>
              <Text style={[typography.body, { color: theme.colors.text }]}>At</Text>
              <NativeTimePicker
                compact
                label="Time"
                onChange={(date) => onChange(localTimeOf(date))}
                value={timeDate(time)}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
});
