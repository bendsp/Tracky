import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTracky } from '../../src/store/TrackyProvider';

export default function TabsLayout() {
  const { theme } = useTracky();

  return (
    <NativeTabs
      backgroundColor={theme.colors.glassFallback}
      blurEffect={
        theme.dark
          ? 'systemChromeMaterialDark'
          : 'systemChromeMaterialLight'
      }
      iconColor={{
        default: theme.colors.glassIcon,
        selected: theme.colors.accent,
      }}
      labelStyle={{
        default: { color: theme.colors.glassIcon },
        selected: { color: theme.colors.accent },
      }}
      shadowColor="transparent"
      tintColor={theme.colors.accent}
    >
      <NativeTabs.Trigger name="track">
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'checkmark.circle',
            selected: 'checkmark.circle.fill',
          }}
        />
        <NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
