import { Stack } from 'expo-router';

import { nativeStackOptions } from '../../../src/navigation/screenOptions';
import { useTracky } from '../../../src/store/TrackyProvider';

export default function SettingsLayout() {
  const { theme } = useTracky();

  return <Stack screenOptions={nativeStackOptions(theme)} />;
}
