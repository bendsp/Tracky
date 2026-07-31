import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type {
  Routine,
  RoutineProgress,
  Task,
  Tracker,
  ISOWeekday,
} from '../src/domain/models';
import {
  buildDayPlan,
  defaultDaySchedule,
  EARLIER_TASK_HORIZON_DAYS,
  localDaysBetween,
  partitionDayPlan,
  plannedOrRecordedDateIds,
  scheduleOccursOn,
  unfinishedTasksBefore,
  type DayPlanItem,
} from '../src/domain/planning';

const timestamp = '2026-07-27T08:00:00.000Z';

function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker_water',
    name: 'Water',
    icon: 'droplet',
    color: '#0A84FF',
    goal: { targetCount: 2, period: 'day', startDate: '2026-07-27' },
    schedule: defaultDaySchedule('2026-07-27'),
    fields: [],
    summary: {
      calculation: 'count',
      timeframe: 'today',
      countLabel: 'glasses',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_lunch',
    name: 'Pack lunch',
    scheduledDate: '2026-07-29',
    time: '08:00',
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'routine_morning',
    name: 'Morning routine',
    icon: 'star',
    color: '#FF9F0A',
    schedule: {
      ...defaultDaySchedule('2026-07-27'),
      time: '07:30',
    },
    steps: [
      { id: 'step_teeth', name: 'Brush teeth' },
      { id: 'step_bag', name: 'Pack bag' },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('day schedules', () => {
  test('weekly schedules and explicit exceptions decide occurrence', () => {
    const schedule = {
      ...defaultDaySchedule('2026-07-27'),
      recurrence: {
        frequency: 'weekly' as const,
        interval: 1,
        weekdays: [1, 3, 5] as ISOWeekday[],
      },
      exceptions: [
        { date: '2026-07-29', behavior: 'skip' as const },
        { date: '2026-07-30', behavior: 'include' as const },
      ],
    };

    assert.equal(scheduleOccursOn(schedule, '2026-07-27'), true);
    assert.equal(scheduleOccursOn(schedule, '2026-07-28'), false);
    assert.equal(scheduleOccursOn(schedule, '2026-07-29'), false);
    assert.equal(scheduleOccursOn(schedule, '2026-07-30'), true);
  });

  test('interval schedules are anchored and do not drift across DST', () => {
    const schedule = {
      ...defaultDaySchedule('2026-03-28'),
      recurrence: { frequency: 'daily' as const, interval: 2 },
    };

    assert.equal(scheduleOccursOn(schedule, '2026-03-28'), true);
    assert.equal(scheduleOccursOn(schedule, '2026-03-29'), false);
    assert.equal(scheduleOccursOn(schedule, '2026-03-30'), true);
  });
});

describe('day plan projection', () => {
  test('projects separate persisted types into one ordered row language', () => {
    const water = tracker();
    const morning = routine();
    const plan = buildDayPlan({
      date: '2026-07-29',
      trackers: [water],
      events: [
        {
          id: 'event_water',
          trackerId: water.id,
          occurredAt: '2026-07-29T06:00:00.000Z',
          forDate: '2026-07-29',
          values: {},
          note: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      tasks: [task()],
      routines: [morning],
      routineProgress: [],
    });

    assert.deepEqual(plan.map((item) => item.kind), [
      'routine',
      'task',
      'tracker',
    ]);
    assert.equal(plan[2].count, 1);
    assert.equal(plan[2].target, 2);
    assert.equal(plan[2].detail, '1 of 2');
  });

  test('uses a routine run snapshot after the template changes', () => {
    const editedRoutine = routine({
      steps: [{ id: 'step_new', name: 'A new template step' }],
    });
    const progress: RoutineProgress = {
      id: 'run_morning_2026-07-29',
      routineId: editedRoutine.id,
      forDate: '2026-07-29',
      steps: [
        {
          id: 'step_teeth',
          name: 'Brush teeth',
          completedAt: '2026-07-29T05:35:00.000Z',
        },
        {
          id: 'step_bag',
          name: 'Pack bag',
          completedAt: null,
        },
      ],
      startedAt: '2026-07-29T05:33:00.000Z',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const [item] = buildDayPlan({
      date: '2026-07-29',
      trackers: [],
      events: [],
      tasks: [],
      routines: [editedRoutine],
      routineProgress: [progress],
    });

    assert.equal(item.kind, 'routine');
    assert.equal(item.count, 1);
    assert.equal(item.target, 2);
  });

  test('keeps skipped scheduled items visible so the day can restore them', () => {
    const skippedWater = tracker({
      schedule: {
        ...defaultDaySchedule('2026-07-27'),
        exceptions: [{ date: '2026-07-29', behavior: 'skip' }],
      },
    });
    const skippedMorning = routine({
      schedule: {
        ...routine().schedule,
        exceptions: [{ date: '2026-07-29', behavior: 'skip' }],
      },
    });
    const plan = buildDayPlan({
      date: '2026-07-29',
      trackers: [skippedWater],
      events: [],
      tasks: [],
      routines: [skippedMorning],
      routineProgress: [],
    });

    assert.deepEqual(
      plan.map((item) => [item.kind, item.skipped]),
      [
        ['routine', true],
        ['tracker', true],
      ],
    );
  });

  test('keeps unfinished older tasks out of today rows but available as one backlog', () => {
    const older = task({ id: 'older', scheduledDate: '2026-07-27' });
    const completed = task({
      id: 'completed',
      scheduledDate: '2026-07-28',
      completedAt: timestamp,
    });
    const today = task({ id: 'today' });

    assert.deepEqual(
      unfinishedTasksBefore([older, completed, today], '2026-07-29').map(
        (item) => item.id,
      ),
      ['older'],
    );
  });

  test('the backlog stops counting once a task falls out of the horizon', () => {
    const inside = task({ id: 'inside', scheduledDate: '2026-07-16' });
    const outside = task({ id: 'outside', scheduledDate: '2026-07-14' });

    assert.equal(EARLIER_TASK_HORIZON_DAYS, 14);
    assert.deepEqual(
      unfinishedTasksBefore([inside, outside], '2026-07-29').map(
        (item) => item.id,
      ),
      ['inside'],
    );
  });

  test('marks projected standing items in a visible date window', () => {
    const water = tracker({
      schedule: {
        ...defaultDaySchedule('2026-07-27'),
        recurrence: { frequency: 'daily', interval: 2 },
      },
    });
    const marked = plannedOrRecordedDateIds({
      dates: ['2026-07-31', '2026-08-01', '2026-08-02'],
      events: [],
      routineProgress: [],
      routines: [],
      tasks: [],
      trackers: [water],
    });

    assert.deepEqual([...marked], ['2026-07-31', '2026-08-02']);
  });
});

function planItem(overrides: Partial<DayPlanItem> = {}): DayPlanItem {
  return {
    id: `task:${overrides.time ?? 'none'}`,
    kind: 'task',
    source: task(),
    time: null,
    skipped: false,
    complete: false,
    count: 0,
    target: 1,
    detail: '',
    ...overrides,
  } as DayPlanItem;
}

describe('times', () => {
  test('a tracker time remains a single point', () => {
    const scheduled = tracker({
      schedule: {
        ...defaultDaySchedule('2026-07-27'),
        time: '09:00',
      },
    });
    const [item] = buildDayPlan({
      date: '2026-07-29',
      trackers: [scheduled],
      events: [],
      tasks: [],
      routines: [],
      routineProgress: [],
    });

    assert.equal(item.detail, '09:00');
  });

  test('a routine reports its optional time without estimating an end', () => {
    const [item] = buildDayPlan({
      date: '2026-07-29',
      trackers: [],
      events: [],
      tasks: [],
      routines: [routine()],
      routineProgress: [],
    });

    assert.equal(item.detail, '0 of 2 steps · 07:30');
  });
});

describe('calendar-day distance', () => {
  test('the window is measured in whole calendar days', () => {
    assert.equal(localDaysBetween('2026-07-29', '2026-08-01'), 3);
    assert.equal(localDaysBetween('2026-08-01', '2026-07-29'), -3);
    assert.equal(localDaysBetween('2026-03-28', '2026-03-30'), 2);
  });
});

describe('the day layout', () => {
  test('skipped items leave the day rather than sitting in it', () => {
    const items = [
      planItem({ id: 'a' }),
      planItem({ id: 'b', skipped: true } as Partial<DayPlanItem>),
    ];
    const { active, skipped } = partitionDayPlan(items);

    assert.deepEqual(active.map((item) => item.id), ['a']);
    assert.deepEqual(skipped.map((item) => item.id), ['b']);
  });

});
