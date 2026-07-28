import {
  DatePicker,
  Host,
} from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { localDateKey } from '../../domain/tracking';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { Sheet } from '../Sheet';

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function TrackerStartDateSheet({
  onClose,
  onSelect,
  selected,
  visible,
}: {
  onClose: () => void;
  onSelect: (value: string) => void;
  selected: string;
  visible: boolean;
}) {
  const { theme } = useTracky();
  const [draftDate, setDraftDate] = useState(() => dateFromKey(selected));

  useEffect(() => {
    if (visible) setDraftDate(dateFromKey(selected));
  }, [selected, visible]);

  return (
    <Sheet
      cancelLabel="Cancel"
      confirmLabel="Done"
      onClose={onClose}
      onConfirm={() => {
        onSelect(localDateKey(draftDate));
        onClose();
      }}
      title="Start Date"
      visible={visible}
    >
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
              setDraftDate(date);
            }}
            selection={draftDate}
            title=""
          />
        </Host>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  calendar: {
    alignItems: 'center',
    minHeight: 330,
    width: '100%',
  },
  picker: {
    height: 330,
    width: '100%',
  },
});
