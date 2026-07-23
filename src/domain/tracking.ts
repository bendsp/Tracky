import type {
  TrackedEvent,
  Tracker,
  TrackerEntryValue,
  TrackerField,
  TrackerSummaryTimeframe,
} from './models';

export const timeframeLabels: Record<TrackerSummaryTimeframe, string> = {
  today: 'Today',
  thisWeek: 'This week',
};

function startFor(timeframe: TrackerSummaryTimeframe, now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (timeframe === 'thisWeek') {
    const weekday = start.getDay();
    start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  }
  return start;
}

export function eventsInTimeframe(
  events: TrackedEvent[],
  timeframe: TrackerSummaryTimeframe,
  now = new Date(),
) {
  const start = startFor(timeframe, now).getTime();
  return events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= start && occurredAt <= now.getTime();
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

function singularize(label: string) {
  if (label.endsWith('ies')) return `${label.slice(0, -3)}y`;
  if (label.endsWith('s') && !label.endsWith('ss')) return label.slice(0, -1);
  return label;
}

export function trackerSummary(
  tracker: Tracker,
  allEvents: TrackedEvent[],
  now = new Date(),
) {
  const events = eventsInTimeframe(
    allEvents.filter((event) => event.trackerId === tracker.id),
    tracker.summary.timeframe,
    now,
  );

  if (tracker.summary.calculation === 'count') {
    const count = events.length;
    const label = tracker.summary.countLabel.trim() || 'entries';
    return {
      detail: timeframeLabels[tracker.summary.timeframe],
      value: `${count} ${count === 1 ? singularize(label) : label}`,
    };
  }

  const summary = tracker.summary;
  const field = tracker.fields.find(
    (candidate) =>
      candidate.id === summary.fieldId && candidate.type === 'number',
  );
  const total = events.reduce((sum, event) => {
    const value = event.values[summary.fieldId];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    detail: timeframeLabels[tracker.summary.timeframe],
    value: `${formatNumber(total)}${field?.type === 'number' && field.unit ? ` ${field.unit}` : ''}`,
  };
}

export function formatFieldValue(
  field: TrackerField,
  value: TrackerEntryValue | undefined,
) {
  if (value === null || value === undefined || value === '') return null;
  if (field.type === 'number' && typeof value === 'number') {
    return `${formatNumber(value)}${field.unit ? ` ${field.unit}` : ''}`;
  }
  if (field.type === 'date' && typeof value === 'string') {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
  return String(value);
}

export function eventTitle(tracker: Tracker, event: TrackedEvent) {
  for (const field of tracker.fields) {
    const formatted = formatFieldValue(field, event.values[field.id]);
    if (formatted) return formatted;
  }
  return tracker.name;
}

export function eventDetail(tracker: Tracker, event: TrackedEvent) {
  const parts = tracker.fields
    .map((field) => {
      const value = formatFieldValue(field, event.values[field.id]);
      return value ? `${field.name}: ${value}` : null;
    })
    .filter((value): value is string => !!value);
  if (event.note) parts.push(event.note);
  return parts.join(' · ') || null;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupEventsByDate(events: TrackedEvent[]) {
  const groups = new Map<string, TrackedEvent[]>();
  for (const event of [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  )) {
    const date = new Date(event.occurredAt);
    if (!Number.isFinite(date.getTime())) continue;
    const key = localDateKey(date);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([dateKey, groupedEvents]) => ({
    dateKey,
    events: groupedEvents,
  }));
}
