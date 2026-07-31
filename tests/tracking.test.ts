import assert from 'node:assert/strict';
import test from 'node:test';

import {
  currentGoalStreak,
  currentStreak,
  localDateKey,
  trackerGoalStatus,
} from '../src/domain/tracking';
import type { TrackedEvent, Tracker } from '../src/domain/models';
import { defaultDaySchedule } from '../src/domain/planning';

function dateKey(year: number, month: number, day: number) {
  return localDateKey(new Date(year, month - 1, day, 12));
}

test('counts a streak through today', () => {
  const days = new Set([
    dateKey(2026, 7, 26),
    dateKey(2026, 7, 27),
    dateKey(2026, 7, 28),
  ]);

  assert.equal(currentStreak(days, new Date(2026, 6, 28, 18)), 3);
});

test('keeps yesterday as the active streak before today is checked in', () => {
  const days = new Set([
    dateKey(2026, 7, 26),
    dateKey(2026, 7, 27),
  ]);

  assert.equal(currentStreak(days, new Date(2026, 6, 28, 8)), 2);
});

test('returns zero when the most recent check-in is older than yesterday', () => {
  const days = new Set([dateKey(2026, 7, 26)]);

  assert.equal(currentStreak(days, new Date(2026, 6, 28, 8)), 0);
});

function tracker(
  period: Tracker['goal']['period'],
  targetCount: number,
  startDate = '2026-07-01',
): Tracker {
  return {
    id: 'tracker',
    name: 'Workouts',
    icon: 'activity',
    color: '#FFFFFF',
    goal: { period, startDate, targetCount },
    schedule: defaultDaySchedule(startDate),
    fields: [],
    summary: {
      calculation: 'count',
      timeframe: 'today',
      countLabel: 'check-ins',
    },
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

function event(id: string, occurredAt: string): TrackedEvent {
  const instant = new Date(occurredAt);
  return {
    id,
    trackerId: 'tracker',
    occurredAt,
    forDate: localDateKey(instant),
    values: {},
    note: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

test('weekly goals complete only when the target count is reached', () => {
  const weekly = tracker('week', 3);
  const now = new Date(2026, 6, 29, 12);
  const events = [
    event('one', new Date(2026, 6, 27, 9).toISOString()),
    event('two', new Date(2026, 6, 28, 9).toISOString()),
  ];

  assert.deepEqual(trackerGoalStatus(weekly, events, now), {
    complete: false,
    count: 2,
    detail: '2 of 3 this week',
    events,
    targetCount: 3,
  });

  const completed = trackerGoalStatus(
    weekly,
    [...events, event('three', new Date(2026, 6, 29, 9).toISOString())],
    now,
  );
  assert.equal(completed.complete, true);
  assert.equal(completed.detail, 'Done this week');
});

test('goal progress ignores entries before the configured start date', () => {
  const monthly = tracker('month', 2, '2026-07-15');
  const status = trackerGoalStatus(
    monthly,
    [
      event('before', new Date(2026, 6, 10, 9).toISOString()),
      event('after', new Date(2026, 6, 20, 9).toISOString()),
    ],
    new Date(2026, 6, 28, 12),
  );

  assert.equal(status.count, 1);
  assert.equal(status.detail, '1 of 2 this month');
});

test('weekly streaks count consecutive completed goal periods', () => {
  const weekly = tracker('week', 2, '2026-07-01');
  const events = [
    event('week-1-a', new Date(2026, 6, 13, 9).toISOString()),
    event('week-1-b', new Date(2026, 6, 14, 9).toISOString()),
    event('week-2-a', new Date(2026, 6, 20, 9).toISOString()),
    event('week-2-b', new Date(2026, 6, 21, 9).toISOString()),
  ];

  assert.equal(
    currentGoalStreak(weekly, events, new Date(2026, 6, 28, 12)),
    2,
  );
});
