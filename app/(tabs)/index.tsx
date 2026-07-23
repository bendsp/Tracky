import { CalendarTimelineScreen } from '../../src/components/calendar/CalendarTimelineScreen';
import { WixCalendarControl } from '../../src/components/calendar/WixCalendarControl';

export default function CalendarScreen() {
  return (
    <CalendarTimelineScreen
      renderCalendar={(props) => <WixCalendarControl {...props} />}
      title="Calendar"
    />
  );
}
