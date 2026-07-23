import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

export function useTimeframeNow() {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let boundaryTimer: ReturnType<typeof setTimeout> | undefined;

      const scheduleNextDay = () => {
        if (boundaryTimer) clearTimeout(boundaryTimer);
        const current = new Date();
        const nextDay = new Date(current);
        nextDay.setDate(current.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        boundaryTimer = setTimeout(() => {
          setNow(new Date());
          scheduleNextDay();
        }, Math.max(1, nextDay.getTime() - current.getTime() + 100));
      };

      const refresh = () => {
        setNow(new Date());
        scheduleNextDay();
      };

      refresh();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refresh();
      });

      return () => {
        if (boundaryTimer) clearTimeout(boundaryTimer);
        subscription.remove();
      };
    }, []),
  );

  return now;
}
