import type {
  ActivityBlock,
  TrackedEvent,
} from '../../domain/models';

export function toLocalDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDateId(dateId: string) {
  const [year, month, day] = dateId.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function fromCalendarDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = fromLocalDateId(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  return new Date(
    instant.getFullYear(),
    instant.getMonth(),
    instant.getDate(),
    12,
  );
}

export function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
}

export function recordedDateIds(
  activities: ActivityBlock[],
  events: TrackedEvent[],
  now: Date,
) {
  const result = new Set<string>();
  const earliest = new Date(now.getFullYear() - 5, now.getMonth(), 1, 12);
  const latest = new Date(now.getFullYear() + 5, now.getMonth() + 1, 0, 12);
  for (const event of events) {
    const occurredAt = new Date(event.occurredAt);
    if (
      Number.isFinite(occurredAt.getTime()) &&
      occurredAt >= earliest &&
      occurredAt <= latest
    ) {
      result.add(toLocalDateId(occurredAt));
    }
  }

  for (const activity of activities) {
    const cursor = new Date(activity.startedAt);
    const end = activity.endedAt ? new Date(activity.endedAt) : now;
    if (
      !Number.isFinite(cursor.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end < cursor
    ) {
      continue;
    }
    cursor.setHours(12, 0, 0, 0);
    const endDay = new Date(end.getTime() - 1);
    endDay.setHours(12, 0, 0, 0);
    if (endDay < earliest || cursor > latest) continue;
    if (cursor < earliest) cursor.setTime(earliest.getTime());
    if (endDay > latest) endDay.setTime(latest.getTime());

    while (cursor <= endDay) {
      result.add(toLocalDateId(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return result;
}
