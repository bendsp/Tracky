import { Stack } from 'expo-router';

import { nativeStackOptions } from '../../../src/navigation/screenOptions';
import { DaySelectionProvider } from '../../../src/store/DaySelectionProvider';
import { useTracky } from '../../../src/store/TrackyProvider';

export default function TrackLayout() {
  const { theme } = useTracky();

  return (
    <DaySelectionProvider>
      <Stack screenOptions={nativeStackOptions(theme)} />
    </DaySelectionProvider>
  );
}
