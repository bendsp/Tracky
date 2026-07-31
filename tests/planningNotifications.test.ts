import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Routine,
  Task,
  Tracker,
  TrackyData,
} from '../src/domain/models';
import { defaultDaySchedule } from '../src/domain/planning';
import { buildPlanningNotificationSpecs } from '../src/notifications/planningNotifications';

const createdAt = '2026-07-01T08:00:00.000Z';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Pack lunch',
    scheduledDate: '2026-07-31',
    time: '09:00',
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    name: 'Drink water',
    icon: 'droplet',
    color: '#FF9500',
    goal: { period: 'day', startDate: '2026-07-31', targetCount: 1 },
    schedule: { ...defaultDaySchedule('2026-07-31'), time: '10:00' },
    fields: [],
    summary: {
      calculation: 'count',
      countLabel: 'entries',
      timeframe: 'today',
    },
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'routine-1',
    name: 'Leave home',
    icon: 'star',
    color: '#34C759',
    schedule: { ...defaultDaySchedule('2026-07-31'), time: '11:00' },
    steps: [
      { id: 'step-1', name: 'Keys' },
      { id: 'step-2', name: 'Shoes' },
    ],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function data(overrides: Partial<TrackyData> = {}): TrackyData {
  return {
    activities: [],
    activityTypes: [],
    events: [],
    routineProgress: [],
    routines: [],
    tasks: [],
    trackers: [],
    ...overrides,
  };
}

test('builds ordered local reminders with routes for every timed day item', () => {
  const specs = buildPlanningNotificationSpecs(
    data({ tasks: [task()], trackers: [tracker()], routines: [routine()] }),
    new Date(2026, 6, 31, 8, 0),
    0,
  );

  assert.deepEqual(
    specs.map((spec) => [spec.title, spec.triggerAt.getHours()]),
    [
      ['Pack lunch', 9],
      ['Drink water', 10],
      ['Leave home', 11],
    ],
  );
  assert.equal(specs[0].data.url, '/task-editor?taskId=task-1');
  assert.equal(
    specs[2].data.url,
    '/routine-runner?routineId=routine-1&date=2026-07-31',
  );
});

test('omits past, completed, skipped, and untimed items', () => {
  const skippedTracker = tracker({
    schedule: {
      ...tracker().schedule,
      exceptions: [{ date: '2026-07-31', behavior: 'skip' }],
    },
  });
  const specs = buildPlanningNotificationSpecs(
    data({
      tasks: [
        task({ id: 'done', completedAt: createdAt }),
        task({ id: 'past', time: '07:00' }),
        task({ id: 'untimed', time: null }),
      ],
      trackers: [skippedTracker],
    }),
    new Date(2026, 6, 31, 8, 0),
    0,
  );
  assert.deepEqual(specs, []);
});

test('projects recurrence into a bounded rolling window', () => {
  const recurring = tracker({
    schedule: {
      ...tracker().schedule,
      recurrence: { frequency: 'daily', interval: 2 },
    },
  });
  const specs = buildPlanningNotificationSpecs(
    data({ trackers: [recurring] }),
    new Date(2026, 6, 31, 8, 0),
    6,
    2,
  );
  assert.deepEqual(
    specs.map((spec) => spec.data.forDate),
    ['2026-07-31', '2026-08-02'],
  );
});
