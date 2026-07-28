import {
  DatePicker,
  Host,
} from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../design/theme';
import { localDateKey } from '../../domain/tracking';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function TrackerStartDatePicker({
  onSelect,
  selected,
}: {
  onSelect: (value: string) => void;
  selected: string;
}) {
  const { theme } = useTracky();

  return (
    <View style={styles.calendar}>
        <Host
          colorScheme={theme.scheme}
          seedColor={theme.colors.accent}
          style={styles.picker}
        >
          <DatePicker
            displayedComponents={['date']}
            modifiers={[datePickerStyle('graphical')]}
            onDateChange={(date) => {
              selectionHaptic();
              onSelect(localDateKey(date));
            }}
            selection={dateFromKey(selected)}
            title=""
          />
        </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 330,
    paddingTop: spacing.lg,
  },
  picker: {
    height: 330,
    width: '100%',
  },
});
