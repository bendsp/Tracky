import type {
  TrackedEvent,
  Tracker,
  TrackerEntryValue,
  TrackerField,
  TrackerGoal,
  TrackerGoalPeriod,
  TrackerSummaryTimeframe,
} from './models';

export const timeframeLabels: Record<TrackerSummaryTimeframe, string> = {
  today: 'Today',
  thisWeek: 'This week',
};

export const goalPeriodLabels: Record<TrackerGoalPeriod, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

export const goalPeriodStatusLabels: Record<TrackerGoalPeriod, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
};

/**
 * A streak counts consecutive goal *periods*, not days — three weeks on a
 * weekly tracker is a streak of 3. These labels keep the UI honest about which.
 */
export const goalStreakLabels: Record<TrackerGoalPeriod, string> = {
  day: 'Day streak',
  week: 'Week streak',
  month: 'Month streak',
};

export function goalStreakDescription(
  period: TrackerGoalPeriod,
  streak: number,
) {
  const unit = streak === 1 ? period : `${period}s`;
  return `${streak} ${unit} streak`;
}

function localDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function startOfGoalPeriod(period: TrackerGoalPeriod, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const weekday = start.getDay();
    start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  } else if (period === 'month') {
    start.setDate(1);
  }
  return start;
}

function moveGoalPeriod(
  period: TrackerGoalPeriod,
  date: Date,
  amount: number,
) {
  const moved = new Date(date);
  if (period === 'day') moved.setDate(moved.getDate() + amount);
  else if (period === 'week') moved.setDate(moved.getDate() + amount * 7);
  else moved.setMonth(moved.getMonth() + amount);
  return moved;
}

export function eventsForGoal(
  goal: TrackerGoal,
  events: TrackedEvent[],
  now = new Date(),
) {
  const goalStart = localDate(goal.startDate);
  if (!Number.isFinite(goalStart.getTime()) || now < goalStart) return [];
  const naturalStart = startOfGoalPeriod(goal.period, now);
  const activeStart = new Date(
    Math.max(naturalStart.getTime(), goalStart.getTime()),
  );
  const activeStartKey = localDateKey(activeStart);
  const endKey = localDateKey(now);

  return events.filter(
    (event) => event.forDate >= activeStartKey && event.forDate <= endKey,
  );
}

export function trackerGoalStatus(
  tracker: Tracker,
  allEvents: TrackedEvent[],
  now = new Date(),
) {
  const events = eventsForGoal(
    tracker.goal,
    allEvents.filter((event) => event.trackerId === tracker.id),
    now,
  );
  const count = events.length;
  const complete = count >= tracker.goal.targetCount;
  const periodLabel = goalPeriodStatusLabels[tracker.goal.period];
  return {
    complete,
    count,
    detail: complete
      ? `Done ${periodLabel}`
      : tracker.goal.targetCount === 1
        ? `Not done ${periodLabel}`
        : `${count} of ${tracker.goal.targetCount} ${periodLabel}`,
    events,
    targetCount: tracker.goal.targetCount,
  };
}

export function currentGoalStreak(
  tracker: Tracker,
  allEvents: TrackedEvent[],
  now = new Date(),
) {
  const goalStart = localDate(tracker.goal.startDate);
  if (!Number.isFinite(goalStart.getTime()) || now < goalStart) return 0;
  const trackerEvents = allEvents.filter(
    (event) => event.trackerId === tracker.id,
  );
  let periodStart = startOfGoalPeriod(tracker.goal.period, now);

  const countInPeriod = (start: Date) => {
    const next = moveGoalPeriod(tracker.goal.period, start, 1);
    const effectiveStart = new Date(
      Math.max(start.getTime(), goalStart.getTime()),
    );
    const startKey = localDateKey(effectiveStart);
    const nextKey = localDateKey(next);
    const nowKey = localDateKey(now);
    return trackerEvents.filter(
      (event) =>
        event.forDate >= startKey &&
        event.forDate < nextKey &&
        event.forDate <= nowKey,
    ).length;
  };

  if (countInPeriod(periodStart) < tracker.goal.targetCount) {
    periodStart = moveGoalPeriod(tracker.goal.period, periodStart, -1);
  }

  let streak = 0;
  while (moveGoalPeriod(tracker.goal.period, periodStart, 1) > goalStart) {
    if (countInPeriod(periodStart) < tracker.goal.targetCount) break;
    streak += 1;
    periodStart = moveGoalPeriod(tracker.goal.period, periodStart, -1);
  }
  return streak;
}

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
  const start = localDateKey(startFor(timeframe, now));
  const end = localDateKey(now);
  return events.filter(
    (event) => event.forDate >= start && event.forDate <= end,
  );
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

export function currentStreak(
  daysWithEntries: Set<string>,
  now = new Date(),
) {
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);

  if (!daysWithEntries.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (daysWithEntries.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function groupEventsByDate(events: TrackedEvent[]) {
  const groups = new Map<string, TrackedEvent[]>();
  for (const event of [...events].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  )) {
    const key = event.forDate;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([dateKey, groupedEvents]) => ({
    dateKey,
    events: groupedEvents,
  }));
}
