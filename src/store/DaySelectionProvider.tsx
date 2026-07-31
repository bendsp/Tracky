import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { LocalDate } from '../domain/models';
import { localDateKey } from '../domain/tracking';
import { useTimeframeNow } from '../hooks/useTimeframeNow';

type DaySelectionValue = {
  now: Date;
  selectedDate: LocalDate;
  selectDate: (date: LocalDate) => void;
  today: LocalDate;
};

const DaySelectionContext = createContext<DaySelectionValue | null>(null);

export function DaySelectionProvider({ children }: PropsWithChildren) {
  const now = useTimeframeNow(true);
  const today = localDateKey(now);
  const previousToday = useRef(today);
  const [selectedDate, setSelectedDate] = useState<LocalDate>(today);

  useEffect(() => {
    if (previousToday.current === today) return;
    const priorToday = previousToday.current;
    previousToday.current = today;
    setSelectedDate((current) => current === priorToday ? today : current);
  }, [today]);

  const selectDate = useCallback((date: LocalDate) => setSelectedDate(date), []);
  const value = useMemo(
    () => ({ now, selectedDate, selectDate, today }),
    [now, selectDate, selectedDate, today],
  );

  return (
    <DaySelectionContext.Provider value={value}>
      {children}
    </DaySelectionContext.Provider>
  );
}

export function useDaySelection() {
  const value = useContext(DaySelectionContext);
  if (!value) {
    throw new Error('useDaySelection must be used inside DaySelectionProvider');
  }
  return value;
}
