import { NativeTabs } from 'expo-router/unstable-native-tabs';
import {
  CalendarSelectionProvider,
  useCalendarSelection,
} from '../../src/components/calendar/CalendarSelectionProvider';
import { useTracky } from '../../src/store/TrackyProvider';

export default function TabsLayout() {
  return (
    <CalendarSelectionProvider>
      <TabsContent />
    </CalendarSelectionProvider>
  );
}

function TabsContent() {
  const { theme } = useTracky();
  const { selectedDate } = useCalendarSelection();
  const calendarLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
  }).format(selectedDate);

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
      shadowColor={theme.colors.separator}
      tintColor={theme.colors.accent}
    >
      <NativeTabs.Trigger name="track">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
        />
        <NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>{calendarLabel}</NativeTabs.Trigger.Label>
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
