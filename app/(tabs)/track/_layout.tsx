import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useTracky } from '../../../src/store/TrackyProvider';

export default function TrackLayout() {
  const { theme } = useTracky();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
        headerBackButtonDisplayMode: 'minimal',
        headerBlurEffect:
          Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) < 26
            ? 'systemChromeMaterial'
            : undefined,
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerStyle:
          Platform.OS === 'ios'
            ? { backgroundColor: 'transparent' }
            : { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.accent,
        headerTitleAlign: 'left',
        headerTransparent: Platform.OS === 'ios',
      }}
    />
  );
}
