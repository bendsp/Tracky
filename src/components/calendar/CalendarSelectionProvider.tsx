import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type CalendarSelectionContextValue = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
};

const CalendarSelectionContext =
  createContext<CalendarSelectionContextValue | null>(null);

export function CalendarSelectionProvider({ children }: PropsWithChildren) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const value = useMemo(
    () => ({ selectedDate, setSelectedDate }),
    [selectedDate],
  );

  return (
    <CalendarSelectionContext.Provider value={value}>
      {children}
    </CalendarSelectionContext.Provider>
  );
}

export function useCalendarSelection() {
  const value = useContext(CalendarSelectionContext);
  if (!value) {
    throw new Error(
      'useCalendarSelection must be used inside CalendarSelectionProvider',
    );
  }
  return value;
}
