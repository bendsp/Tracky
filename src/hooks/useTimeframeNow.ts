import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

export function useTimeframeNow(refreshEachMinute = false) {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let boundaryTimer: ReturnType<typeof setTimeout> | undefined;

      const scheduleNextBoundary = () => {
        if (boundaryTimer) clearTimeout(boundaryTimer);
        const current = new Date();
        const nextBoundary = new Date(current);
        if (refreshEachMinute) {
          nextBoundary.setSeconds(0, 0);
          nextBoundary.setMinutes(current.getMinutes() + 1);
        } else {
          nextBoundary.setDate(current.getDate() + 1);
          nextBoundary.setHours(0, 0, 0, 0);
        }
        boundaryTimer = setTimeout(() => {
          setNow(new Date());
          scheduleNextBoundary();
        }, Math.max(1, nextBoundary.getTime() - current.getTime() + 100));
      };

      const refresh = () => {
        setNow(new Date());
        scheduleNextBoundary();
      };

      refresh();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refresh();
      });

      return () => {
        if (boundaryTimer) clearTimeout(boundaryTimer);
        subscription.remove();
      };
    }, [refreshEachMinute]),
  );

  return now;
}
