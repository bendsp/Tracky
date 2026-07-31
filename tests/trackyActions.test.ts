import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type {
  DaySchedule,
  PersistedTrackyState,
  Routine,
  RoutineDraft,
  Task,
  TaskDraft,
  TrackedEvent,
  Tracker,
} from '../src/domain/models';
import {
  createRoutine,
  createTask,
  deleteRoutine,
  deleteTask,
  restoreRoutineScheduleDate,
  restoreTrackerScheduleDate,
  skipRoutineScheduleDate,
  skipTrackerScheduleDate,
  toggleRoutineStepCompletion,
  toggleTaskCompletion,
  toggleTrackerCheckInForDate,
  updateRoutine,
  updateTask,
} from '../src/domain/trackyActions';

const createdAt = '2026-07-27T08:00:00.000Z';
const changedAt = '2026-07-29T06:00:00.000Z';

function schedule(overrides: Partial<DaySchedule> = {}): DaySchedule {
  return {
    exceptions: [],
    recurrence: { frequency: 'daily', interval: 1 },
    startDate: '2026-07-27',
    time: null,
    ...overrides,
  };
}

function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker_water',
    name: 'Water',
    icon: 'droplet',
    color: '#0A84FF',
    goal: { targetCount: 2, period: 'week', startDate: '2026-07-27' },
    schedule: schedule(),
    fields: [],
    summary: {
      calculation: 'count',
      timeframe: 'today',
      countLabel: 'glasses',
    },
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function taskDraft(overrides: Partial<TaskDraft> = {}): TaskDraft {
  return {
    name: 'Pack lunch',
    scheduledDate: '2026-07-29',
    time: '08:00',
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_lunch',
    ...taskDraft(),
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function routineDraft(overrides: Partial<RoutineDraft> = {}): RoutineDraft {
  return {
    name: 'Morning routine',
    icon: 'star',
    color: '#FF9F0A',
    schedule: schedule({ time: '07:30' }),
    steps: [
      { id: 'step_teeth', name: 'Brush teeth' },
      { id: 'step_bag', name: 'Pack bag' },
    ],
    ...overrides,
  };
}

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'routine_morning',
    ...routineDraft(),
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function event(
  id: string,
  forDate: string,
  occurredAt: string,
): TrackedEvent {
  return {
    id,
    trackerId: 'tracker_water',
    occurredAt,
    forDate,
    values: {},
    note: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function state(
  overrides: Partial<PersistedTrackyState> = {},
): PersistedTrackyState {
  return {
    activityTypes: [],
    activities: [],
    trackers: [],
    events: [],
    tasks: [],
    routines: [],
    routineProgress: [],
    appearance: 'system',
    schemaVersion: 7,
    ...overrides,
  };
}

describe('task actions', () => {
  test('create, update, toggle, and delete a task deterministically', () => {
    const empty = state();
    const created = createTask(empty, taskDraft({ name: '  Pack lunch  ' }), {
      id: 'task_lunch',
      now: createdAt,
    });

    assert.deepEqual(created.tasks, [task()]);

    const completed = toggleTaskCompletion(created, 'task_lunch', {
      now: changedAt,
    });
    assert.equal(completed.tasks[0].completedAt, changedAt);
    assert.equal(completed.tasks[0].updatedAt, changedAt);

    const edited = updateTask(
      completed,
      'task_lunch',
      taskDraft({ name: 'Bring lunch', scheduledDate: '2026-07-30' }),
      { now: '2026-07-29T07:00:00.000Z' },
    );
    assert.equal(edited.tasks[0].name, 'Bring lunch');
    assert.equal(edited.tasks[0].scheduledDate, '2026-07-30');
    assert.equal(edited.tasks[0].completedAt, changedAt);

    const reopened = toggleTaskCompletion(edited, 'task_lunch', {
      now: '2026-07-29T08:00:00.000Z',
    });
    assert.equal(reopened.tasks[0].completedAt, null);
    assert.deepEqual(deleteTask(reopened, 'task_lunch').tasks, []);
  });

  test('invalid task drafts, IDs, timestamps, and duplicate IDs are no-ops', () => {
    const existing = state({ tasks: [task()] });

    assert.equal(
      createTask(existing, taskDraft(), {
        id: 'task_lunch',
        now: changedAt,
      }),
      existing,
    );
    assert.equal(
      createTask(existing, taskDraft({ name: '   ' }), {
        id: 'task_new',
        now: changedAt,
      }),
      existing,
    );
    assert.equal(
      updateTask(
        existing,
        'missing',
        taskDraft(),
        { now: changedAt },
      ),
      existing,
    );
    assert.equal(
      toggleTaskCompletion(existing, 'task_lunch', { now: 'not-a-date' }),
      existing,
    );
    assert.equal(deleteTask(existing, 'missing'), existing);
  });
});

describe('tracker check-in actions', () => {
  test('a completed period never causes another date to be deleted', () => {
    const monday = event(
      'event_monday',
      '2026-07-27',
      '2026-07-27T06:00:00.000Z',
    );
    const tuesday = event(
      'event_tuesday',
      '2026-07-28',
      '2026-07-28T06:00:00.000Z',
    );
    const original = state({
      trackers: [tracker()],
      events: [monday, tuesday],
    });

    const checked = toggleTrackerCheckInForDate(
      original,
      'tracker_water',
      '2026-07-29',
      { id: 'event_wednesday', now: changedAt },
    );
    assert.deepEqual(
      checked.events.map((item) => item.id),
      ['event_monday', 'event_tuesday', 'event_wednesday'],
    );
    assert.equal(checked.events[2].forDate, '2026-07-29');

    const unchecked = toggleTrackerCheckInForDate(
      checked,
      'tracker_water',
      '2026-07-29',
      { id: 'unused', now: '2026-07-29T07:00:00.000Z' },
    );
    assert.deepEqual(unchecked.events, [monday, tuesday]);
  });

  test('invalid trackers, dates, and event IDs are no-ops', () => {
    const original = state({ trackers: [tracker()] });
    const identity = { id: 'event_new', now: changedAt };

    assert.equal(
      toggleTrackerCheckInForDate(
        original,
        'missing',
        '2026-07-29',
        identity,
      ),
      original,
    );
    assert.equal(
      toggleTrackerCheckInForDate(
        original,
        'tracker_water',
        '2026-02-30',
        identity,
      ),
      original,
    );
    assert.equal(
      toggleTrackerCheckInForDate(
        original,
        'tracker_water',
        '2026-07-26',
        identity,
      ),
      original,
    );
  });
});

describe('routine actions', () => {
  test('a run snapshots its steps and keeps them after the template changes', () => {
    const empty = state();
    const created = createRoutine(empty, routineDraft(), {
      id: 'routine_morning',
      now: createdAt,
    });
    assert.deepEqual(created.routines, [routine()]);

    const started = toggleRoutineStepCompletion(
      created,
      'routine_morning',
      '2026-07-29',
      'step_teeth',
      { id: 'run_morning_2026-07-29', now: changedAt },
    );
    assert.equal(started.routineProgress.length, 1);
    assert.deepEqual(
      started.routineProgress[0].steps.map((step) => step.id),
      ['step_teeth', 'step_bag'],
    );
    assert.equal(started.routineProgress[0].startedAt, changedAt);
    assert.equal(started.routineProgress[0].completedAt, null);

    const edited = updateRoutine(
      started,
      'routine_morning',
      routineDraft({
        steps: [
          { id: 'step_new', name: 'New template step' },
        ],
      }),
      { now: '2026-07-29T06:30:00.000Z' },
    );
    const completed = toggleRoutineStepCompletion(
      edited,
      'routine_morning',
      '2026-07-29',
      'step_bag',
      { id: 'unused', now: '2026-07-29T06:35:00.000Z' },
    );

    assert.deepEqual(
      completed.routineProgress[0].steps.map((step) => step.id),
      ['step_teeth', 'step_bag'],
    );
    assert.equal(
      completed.routineProgress[0].completedAt,
      '2026-07-29T06:35:00.000Z',
    );

    const reopened = toggleRoutineStepCompletion(
      completed,
      'routine_morning',
      '2026-07-29',
      'step_bag',
      { id: 'unused-again', now: '2026-07-29T06:40:00.000Z' },
    );
    assert.equal(reopened.routineProgress[0].steps[1].completedAt, null);
    assert.equal(reopened.routineProgress[0].completedAt, null);

    const deleted = deleteRoutine(reopened, 'routine_morning');
    assert.deepEqual(deleted.routines, []);
    assert.deepEqual(deleted.routineProgress, []);
  });

  test('invalid routine drafts, steps, run IDs, and dates are no-ops', () => {
    const original = state({ routines: [routine()] });
    const duplicateSteps = routineDraft({
      steps: [
        { id: 'same', name: 'One' },
        { id: 'same', name: 'Two' },
      ],
    });

    assert.equal(
      createRoutine(original, duplicateSteps, {
        id: 'routine_other',
        now: changedAt,
      }),
      original,
    );
    assert.equal(
      createRoutine(original, routineDraft({ steps: [] }), {
        id: 'routine_empty',
        now: changedAt,
      }),
      original,
    );
    assert.equal(
      updateRoutine(original, 'missing', routineDraft(), { now: changedAt }),
      original,
    );
    assert.equal(
      toggleRoutineStepCompletion(
        original,
        'routine_morning',
        '2026-07-29',
        'missing',
        { id: 'run', now: changedAt },
      ),
      original,
    );
    assert.equal(deleteRoutine(original, 'missing'), original);
  });
});

describe('schedule exception actions', () => {
  test('skip and restore are idempotent for trackers and routines', () => {
    const original = state({
      trackers: [tracker()],
      routines: [routine()],
    });
    const trackerSkipped = skipTrackerScheduleDate(
      original,
      'tracker_water',
      '2026-07-29',
      { now: changedAt },
    );
    assert.deepEqual(trackerSkipped.trackers[0].schedule.exceptions, [
      { date: '2026-07-29', behavior: 'skip' },
    ]);
    assert.equal(
      skipTrackerScheduleDate(
        trackerSkipped,
        'tracker_water',
        '2026-07-29',
        { now: '2026-07-29T07:00:00.000Z' },
      ),
      trackerSkipped,
    );
    const trackerRestored = restoreTrackerScheduleDate(
      trackerSkipped,
      'tracker_water',
      '2026-07-29',
      { now: '2026-07-29T07:00:00.000Z' },
    );
    assert.deepEqual(trackerRestored.trackers[0].schedule.exceptions, []);

    const routineSkipped = skipRoutineScheduleDate(
      trackerRestored,
      'routine_morning',
      '2026-07-29',
      { now: changedAt },
    );
    assert.deepEqual(routineSkipped.routines[0].schedule.exceptions, [
      { date: '2026-07-29', behavior: 'skip' },
    ]);
    assert.equal(
      toggleRoutineStepCompletion(
        routineSkipped,
        'routine_morning',
        '2026-07-29',
        'step_teeth',
        { id: 'run', now: changedAt },
      ),
      routineSkipped,
    );
    const routineRestored = restoreRoutineScheduleDate(
      routineSkipped,
      'routine_morning',
      '2026-07-29',
      { now: '2026-07-29T07:00:00.000Z' },
    );
    assert.deepEqual(routineRestored.routines[0].schedule.exceptions, []);
  });

  test('invalid IDs and calendar values leave schedules untouched', () => {
    const original = state({
      trackers: [tracker()],
      routines: [routine()],
    });

    assert.equal(
      skipTrackerScheduleDate(original, 'missing', '2026-07-29', {
        now: changedAt,
      }),
      original,
    );
    assert.equal(
      skipRoutineScheduleDate(original, 'routine_morning', '2026-02-30', {
        now: changedAt,
      }),
      original,
    );
    assert.equal(
      restoreRoutineScheduleDate(
        original,
        'routine_morning',
        '2026-07-29',
        { now: changedAt },
      ),
      original,
    );
  });
});
