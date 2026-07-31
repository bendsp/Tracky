import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';

import { useTracky } from '../store/TrackyProvider';
import { localDateKey } from '../domain/tracking';
import {
  buildPlanningNotificationSpecs,
  type PlanningNotificationSpec,
} from './planningNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isTrackyPlanningNotification(
  request: Notifications.NotificationRequest,
) {
  return request.content.data?.trackyPlanning === true;
}

async function replacePlanningNotifications(
  specs: PlanningNotificationSpec[],
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(isTrackyPlanningNotification)
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') return;

  for (const spec of specs) {
    await Notifications.scheduleNotificationAsync({
      content: {
        body: spec.body,
        data: spec.data,
        sound: false,
        title: spec.title,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: spec.triggerAt,
      },
    });
  }
}

let notificationQueue = Promise.resolve();

function queuePlanningNotificationReplacement(
  specs: PlanningNotificationSpec[],
) {
  notificationQueue = notificationQueue
    .catch(() => undefined)
    .then(() => replacePlanningNotifications(specs));
  return notificationQueue;
}

function planningEnvironmentSignature() {
  return `${localDateKey(new Date())}|${Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''}`;
}

export async function requestPlanningNotificationPermission() {
  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted' && permissions.canAskAgain) {
    permissions = await Notifications.requestPermissionsAsync();
  }
  if (permissions.status === 'granted') return true;

  Alert.alert(
    'Reminders are off',
    'Tracky will keep the time on your day. You can allow notifications in Settings whenever you want reminders too.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
  return false;
}

function openNotificationUrl(
  router: ReturnType<typeof useRouter>,
  notification: Notifications.Notification,
) {
  const url = notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) {
    router.push(url as Href);
  }
}

export function PlanningNotifications() {
  const router = useRouter();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const {
    events,
    hydrated,
    routineProgress,
    routines,
    tasks,
    trackers,
  } = useTracky();

  useEffect(() => {
    let signature = planningEnvironmentSignature();
    const refresh = () => {
      signature = planningEnvironmentSignature();
      setRefreshRevision((revision) => revision + 1);
    };
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') refresh();
      },
    );
    const environmentTimer = setInterval(() => {
      const nextSignature = planningEnvironmentSignature();
      if (nextSignature === signature) return;
      signature = nextSignature;
      setRefreshRevision((revision) => revision + 1);
    }, 60_000);

    return () => {
      appStateSubscription.remove();
      clearInterval(environmentTimer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const specs = buildPlanningNotificationSpecs({
      events,
      routineProgress,
      routines,
      tasks,
      trackers,
    });
    void queuePlanningNotificationReplacement(specs).catch((error) => {
      console.warn('Could not refresh local planning notifications', error);
    });
  }, [
    events,
    hydrated,
    refreshRevision,
    routineProgress,
    routines,
    tasks,
    trackers,
  ]);

  useEffect(() => {
    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      openNotificationUrl(router, response.notification);
      void Notifications.clearLastNotificationResponseAsync();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (nextResponse) => {
        openNotificationUrl(router, nextResponse.notification);
        void Notifications.clearLastNotificationResponseAsync();
      },
    );
    return () => subscription.remove();
  }, [router]);

  return null;
}
