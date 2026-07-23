import type {
  ActivityBlock,
  EntityId,
  HexColor,
  TrackedEvent,
  Tracker,
} from './models';
import { eventDetail } from './tracking';

export type CalendarActivityZone = {
  id: EntityId;
  activity: ActivityBlock;
  title: string;
  color: HexColor;
  startsAt: Date;
  endsAt: Date;
  continuesBefore: boolean;
  continuesAfter: boolean;
  isRunning: boolean;
};

export type CalendarEventMarker = {
  id: EntityId;
  event: TrackedEvent;
  tracker: Tracker;
  title: string;
  detail: string | null;
  occursAt: Date;
};

export type CalendarDay = {
  date: Date;
  startsAt: Date;
  endsAt: Date;
  activityZones: CalendarActivityZone[];
  eventMarkers: CalendarEventMarker[];
};

type BuildCalendarDayInput = {
  activities: ActivityBlock[];
  date: Date;
  events: TrackedEvent[];
  now: Date;
  trackers: Tracker[];
};

function dayBounds(date: Date) {
  const startsAt = new Date(date);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 1);
  return { startsAt, endsAt };
}

function validDate(value: Date) {
  return Number.isFinite(value.getTime());
}

export function buildCalendarDay({
  activities,
  date,
  events,
  now,
  trackers,
}: BuildCalendarDayInput): CalendarDay {
  const { startsAt, endsAt } = dayBounds(date);
  const activityZones = activities
    .flatMap<CalendarActivityZone>((activity) => {
      const actualStart = new Date(activity.startedAt);
      const actualEnd = activity.endedAt ? new Date(activity.endedAt) : now;
      if (
        !validDate(actualStart) ||
        !validDate(actualEnd) ||
        actualEnd <= actualStart ||
        actualStart >= endsAt ||
        actualEnd <= startsAt
      ) {
        return [];
      }

      return [
        {
          id: activity.id,
          activity,
          title: activity.name,
          color: activity.color,
          startsAt: new Date(Math.max(actualStart.getTime(), startsAt.getTime())),
          endsAt: new Date(Math.min(actualEnd.getTime(), endsAt.getTime())),
          continuesBefore: actualStart < startsAt,
          continuesAfter: actualEnd > endsAt,
          isRunning: activity.endedAt === null,
        },
      ];
    })
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  const trackersById = new Map(
    trackers.map((tracker) => [tracker.id, tracker] as const),
  );
  const eventMarkers = events
    .flatMap<CalendarEventMarker>((event) => {
      const occursAt = new Date(event.occurredAt);
      const tracker = trackersById.get(event.trackerId);
      if (
        !tracker ||
        !validDate(occursAt) ||
        occursAt < startsAt ||
        occursAt >= endsAt
      ) {
        return [];
      }
      return [
        {
          id: event.id,
          event,
          tracker,
          title: tracker.name,
          detail: eventDetail(tracker, event),
          occursAt,
        },
      ];
    })
    .sort((left, right) => left.occursAt.getTime() - right.occursAt.getTime());

  return {
    date: new Date(date),
    startsAt,
    endsAt,
    activityZones,
    eventMarkers,
  };
}
