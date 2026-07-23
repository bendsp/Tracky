import {
  Calendar03Icon,
  Chart02Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import {
  GlassTabBar,
  GlassTabButton,
  TabBarMinimizeProvider,
  renderFadingTabScreen,
  type GlassTabItem,
} from '../../src/components/glass-tabs';

import { Icon } from '../../src/components/Icon';
import { UniversalAdd } from '../../src/components/UniversalAdd';
import {
  CalendarSelectionProvider,
  useCalendarSelection,
} from '../../src/components/calendar/CalendarSelectionProvider';
import { useTracky } from '../../src/store/TrackyProvider';

type TabItem = GlassTabItem & {
  href: '/' | '/track' | '/settings';
  iconNode: typeof Calendar03Icon;
};

export default function TabsLayout() {
  return (
    <CalendarSelectionProvider>
      <TabsContent />
    </CalendarSelectionProvider>
  );
}

function TabsContent() {
  const router = useRouter();
  const { theme } = useTracky();
  const { selectedDate } = useCalendarSelection();
  const calendarLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
  }).format(selectedDate);
  const items: TabItem[] = [
    {
      name: 'index',
      href: '/',
      label: calendarLabel,
      iconNode: Calendar03Icon,
    },
    { name: 'track', href: '/track', label: 'Track', iconNode: Chart02Icon },
    {
      name: 'settings',
      href: '/settings',
      label: 'Settings',
      iconNode: Settings02Icon,
    },
  ];

  return (
    <TabBarMinimizeProvider>
      <Tabs>
        <TabSlot style={{ height: '100%' }} renderFn={renderFadingTabScreen} />
        <TabList asChild>
          <GlassTabBar
            haptics
            onIndexSelected={(index) => router.navigate(items[index].href)}
            theme={{
              activeTint: theme.colors.accent,
              inactiveTint: theme.colors.glassIcon,
              highlight: theme.colors.glassHighlight,
              solidFallback: theme.colors.glassFallback,
            }}
          >
            {items.map(({ href, iconNode, ...item }, index) => {
              const glassItem: GlassTabItem = {
                ...item,
                renderIcon: ({ tint, size }) => (
                  <Icon color={tint} icon={iconNode} size={size} strokeWidth={1.9} />
                ),
              };
              return (
                <TabTrigger
                  asChild
                  href={href}
                  key={item.name}
                  name={item.name}
                >
                  <GlassTabButton index={index} item={glassItem} />
                </TabTrigger>
              );
            })}
          </GlassTabBar>
        </TabList>
        <UniversalAdd />
      </Tabs>
    </TabBarMinimizeProvider>
  );
}
