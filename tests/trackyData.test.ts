import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import type { PersistedTrackyState } from '../src/domain/models';
import {
  createTrackyBackup,
  parseAndMigrateTrackyData,
  replaceStoredTrackyData,
  trackyHydrationErrorMessage,
  TrackyDataError,
  TrackyRollbackError,
  type TrackyStringStorage,
} from '../src/storage/trackyData';
import { TrackyPersistenceQueue } from '../src/storage/TrackyPersistenceQueue';

const timestamp = '2026-07-21T10:00:00.000Z';

function localDateForInstant(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const currentState: PersistedTrackyState = {
  activityTypes: [
    {
      id: 'activity_type_work',
      name: 'Work',
      color: '#3578F6',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  activities: [
    {
      id: 'activity_work',
      activityTypeId: 'activity_type_work',
      name: 'Work',
      color: '#3578F6',
      startedAt: timestamp,
      endedAt: '2026-07-21T11:00:00.000Z',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  trackers: [
    {
      id: 'tracker_water',
      name: 'Water',
      icon: 'droplet',
      color: '#3578F6',
      goal: {
        targetCount: 1,
        period: 'day',
        startDate: '2026-07-21',
      },
      schedule: {
        dayPart: 'anytime',
        durationMinutes: null,
        exceptions: [],
        recurrence: { frequency: 'daily', interval: 1 },
        startDate: '2026-07-21',
        time: null,
      },
      fields: [
        {
          id: 'field_amount',
          name: 'Amount',
          type: 'number',
          unit: 'ml',
        },
      ],
      summary: {
        calculation: 'sum',
        timeframe: 'today',
        fieldId: 'field_amount',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  events: [
    {
      id: 'event_water',
      trackerId: 'tracker_water',
      occurredAt: '2026-07-21T10:30:00.000Z',
      forDate: '2026-07-21',
      values: { field_amount: 500 },
      note: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  tasks: [
    {
      id: 'task_lunch',
      name: 'Pack lunch',
      scheduledDate: '2026-07-22',
      dayPart: 'morning',
      time: '08:00',
      durationMinutes: 10,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  routines: [
    {
      id: 'routine_morning',
      name: 'Morning routine',
      icon: 'star',
      color: '#3578F6',
      schedule: {
        dayPart: 'morning',
        durationMinutes: 7,
        exceptions: [{ date: '2026-07-26', behavior: 'skip' }],
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          weekdays: [1, 2, 3, 4, 5],
        },
        startDate: '2026-07-21',
        time: '07:30',
      },
      // This template has changed since the snapshotted run below.
      steps: [{ id: 'step_new', name: 'New step', durationMinutes: 1 }],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  routineProgress: [
    {
      id: 'run_morning_2026-07-21',
      routineId: 'routine_morning',
      forDate: '2026-07-21',
      steps: [
        {
          id: 'step_teeth',
          name: 'Brush teeth',
          durationMinutes: 2,
          completedAt: '2026-07-21T06:35:00.000Z',
        },
        {
          id: 'step_bag',
          name: 'Pack bag',
          durationMinutes: 5,
          completedAt: null,
        },
      ],
      startedAt: '2026-07-21T06:33:00.000Z',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  appearance: 'system',
  schemaVersion: 6,
};

class MemoryStorage implements TrackyStringStorage {
  value: string | null;
  writes = 0;

  constructor(value: string | null) {
    this.value = value;
  }

  async getItem(_key: string) {
    return this.value;
  }

  async setItem(_key: string, value: string) {
    this.writes += 1;
    this.value = value;
  }
}

describe('Tracky backup compatibility', () => {
  test('current export imports as equivalent persisted state', () => {
    const backup = createTrackyBackup(
      currentState,
      '0.1.0',
      '2026-07-21T12:00:00.000Z',
    );
    const parsed = parseAndMigrateTrackyData(JSON.stringify(backup));

    assert.deepEqual(parsed.state, currentState);
    assert.equal(parsed.state.routineProgress[0].steps[0].id, 'step_teeth');
    assert.equal(parsed.state.routines[0].steps[0].id, 'step_new');
    assert.equal(backup.formatVersion, 1);
    assert.equal(backup.dataSchemaVersion, 6);
    assert.equal(parsed.metadata.appVersion, '0.1.0');
    assert.equal(parsed.metadata.exportedAt, '2026-07-21T12:00:00.000Z');
  });

  test('real schema 2 fixture migrates sequentially to schema 6', () => {
    const fixture = readFileSync(
      new URL('./fixtures/tracky-schema-v2.json', import.meta.url),
      'utf8',
    );
    const parsed = parseAndMigrateTrackyData(fixture);

    assert.equal(parsed.state.schemaVersion, 6);
    assert.deepEqual(parsed.state.trackers[0].goal, {
      targetCount: 1,
      period: 'day',
      startDate: '2026-07-20',
    });
    assert.equal(parsed.state.trackers[0].fields[0].type, 'number');
    assert.deepEqual(parsed.state.trackers[0].schedule, {
      dayPart: 'anytime',
      durationMinutes: null,
      exceptions: [],
      recurrence: { frequency: 'daily', interval: 1 },
      startDate: '2026-07-20',
      time: null,
    });
    assert.equal(
      parsed.state.events[0].forDate,
      localDateForInstant(parsed.state.events[0].occurredAt),
    );
    assert.equal(parsed.state.events[0].values.field_migrated_tracker_legacy_water, 500);
    assert.equal(
      parsed.state.activities[0].activityTypeId,
      'activity_type_migrated_activity_legacy_work',
    );
    assert.deepEqual(parsed.state.tasks, []);
    assert.deepEqual(parsed.state.routines, []);
    assert.deepEqual(parsed.state.routineProgress, []);
  });

  test('schema 5 fixture adds stable effective dates and default schedules', () => {
    const fixture = readFileSync(
      new URL('./fixtures/tracky-schema-v5.json', import.meta.url),
      'utf8',
    );
    const parsed = parseAndMigrateTrackyData(fixture);

    assert.equal(parsed.state.schemaVersion, 6);
    assert.equal(
      parsed.state.events[0].forDate,
      localDateForInstant(parsed.state.events[0].occurredAt),
    );
    assert.deepEqual(parsed.state.trackers[0].schedule, {
      dayPart: 'anytime',
      durationMinutes: null,
      exceptions: [],
      recurrence: { frequency: 'daily', interval: 1 },
      startDate: '2026-07-21',
      time: null,
    });
    assert.deepEqual(parsed.state.tasks, []);
    assert.deepEqual(parsed.state.routines, []);
    assert.deepEqual(parsed.state.routineProgress, []);
  });

  test('schema 3 data migrates through schema 6 with a daily goal and schedule', () => {
    const schemaFive = JSON.parse(
      readFileSync(
        new URL('./fixtures/tracky-schema-v5.json', import.meta.url),
        'utf8',
      ),
    ) as Record<string, unknown> & { trackers: Record<string, unknown>[] };
    const schemaThree = {
      ...schemaFive,
      trackers: schemaFive.trackers.map(({ goal: _goal, ...tracker }) => tracker),
      schemaVersion: 3,
    };
    const parsed = parseAndMigrateTrackyData(schemaThree);

    assert.equal(parsed.state.schemaVersion, 6);
    assert.deepEqual(parsed.state.trackers, currentState.trackers);
  });

  test('current schema accepts every newly added tracker icon', () => {
    for (const icon of ['computer', 'food', 'music', 'sleep'] as const) {
      const parsed = parseAndMigrateTrackyData({
        ...currentState,
        trackers: currentState.trackers.map((tracker) => ({
          ...tracker,
          icon,
        })),
      });

      assert.equal(parsed.state.trackers[0].icon, icon);
    }
  });

  test('unversioned on-device legacy data remains supported', () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL('./fixtures/tracky-schema-v2.json', import.meta.url),
        'utf8',
      ),
    ) as Record<string, unknown>;
    delete fixture.schemaVersion;
    delete fixture.exportedAt;

    const parsed = parseAndMigrateTrackyData(fixture);
    assert.equal(parsed.state.schemaVersion, 6);
    assert.equal(parsed.state.events.length, 1);
  });

  test('malformed and future backups are rejected before storage changes', async () => {
    const storage = new MemoryStorage(JSON.stringify(currentState));
    const futureBackup = {
      ...createTrackyBackup(currentState, '99.0.0'),
      dataSchemaVersion: 99,
      payload: { ...currentState, schemaVersion: 99 },
    };

    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement: futureBackup,
        storage,
      }),
      (error: unknown) =>
        error instanceof TrackyDataError && error.code === 'future-schema',
    );
    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement: '{"format":"tracky-backup"}',
        storage,
      }),
      TrackyDataError,
    );
    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement: {
          ...createTrackyBackup(currentState, '0.1.0'),
          appVersion: undefined,
        },
        storage,
      }),
      TrackyDataError,
    );

    assert.equal(storage.writes, 0);
    assert.deepEqual(
      parseAndMigrateTrackyData(storage.value).state,
      currentState,
    );
  });

  test('successful replacement survives a storage readback', async () => {
    const replacement: PersistedTrackyState = {
      ...currentState,
      trackers: [],
      events: [],
    };
    const storage = new MemoryStorage(JSON.stringify(currentState));

    await replaceStoredTrackyData({
      fallbackCurrentState: currentState,
      key: 'tracky.v1',
      replacement,
      storage,
    });

    const relaunchedState = parseAndMigrateTrackyData(
      await storage.getItem('tracky.v1'),
    ).state;
    assert.deepEqual(relaunchedState, replacement);
  });

  test('failed persistence verification restores the rollback snapshot', async () => {
    const replacement: PersistedTrackyState = {
      ...currentState,
      trackers: [],
      events: [],
    };
    const storage = new MemoryStorage(JSON.stringify(currentState));
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = async (key, value) => {
      if (storage.writes === 0) {
        storage.writes += 1;
        storage.value = '{}';
        return;
      }
      await originalSetItem(key, value);
    };

    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement,
        storage,
      }),
    );
    assert.deepEqual(
      parseAndMigrateTrackyData(storage.value).state,
      currentState,
    );
  });

  test('future-schema hydration keeps the update guidance', () => {
    const futureBackup = {
      ...createTrackyBackup(currentState, '99.0.0'),
      dataSchemaVersion: 99,
      payload: { ...currentState, schemaVersion: 99 },
    };

    let thrown: unknown;
    try {
      parseAndMigrateTrackyData(futureBackup);
    } catch (error) {
      thrown = error;
    }

    assert.match(trackyHydrationErrorMessage(thrown), /Update Tracky/);
  });

  test('rollback uses the authoritative stored state, not a stale fallback', async () => {
    const storedState: PersistedTrackyState = {
      ...currentState,
      appearance: 'dark',
    };
    const fallbackState: PersistedTrackyState = {
      ...currentState,
      appearance: 'light',
    };
    const replacement: PersistedTrackyState = {
      ...currentState,
      trackers: [],
      events: [],
    };
    const storage = new MemoryStorage(JSON.stringify(storedState));
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = async (key, value) => {
      if (storage.writes === 0) {
        storage.writes += 1;
        storage.value = '{}';
        return;
      }
      await originalSetItem(key, value);
    };

    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: fallbackState,
        key: 'tracky.v1',
        replacement,
        storage,
      }),
    );
    assert.deepEqual(
      parseAndMigrateTrackyData(storage.value).state,
      storedState,
    );
  });

  test('invalid current appearance is rejected before storage changes', async () => {
    const storage = new MemoryStorage(JSON.stringify(currentState));

    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement: { ...currentState, appearance: 'sepia' },
        storage,
      }),
      TrackyDataError,
    );
    assert.equal(storage.writes, 0);
  });

  test('date field values require a real YYYY-MM-DD local date', () => {
    const stateWithDateField: PersistedTrackyState = {
      ...currentState,
      trackers: [
        {
          ...currentState.trackers[0],
          fields: [{ id: 'field_date', name: 'Date', type: 'date' }],
          summary: {
            calculation: 'count',
            timeframe: 'today',
            countLabel: 'entries',
          },
        },
      ],
      events: [
        {
          ...currentState.events[0],
          values: { field_date: '2026-07-21' },
        },
      ],
    };

    assert.deepEqual(
      parseAndMigrateTrackyData(stateWithDateField).state,
      stateWithDateField,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...stateWithDateField,
          events: [
            {
              ...stateWithDateField.events[0],
              values: { field_date: '2026-07-21T10:30:00.000Z' },
            },
          ],
        }),
      TrackyDataError,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...stateWithDateField,
          events: [
            {
              ...stateWithDateField.events[0],
              values: { field_date: '2026-02-30' },
            },
          ],
        }),
      TrackyDataError,
    );
  });

  test('schema 6 requires explicit effective dates and all new collections', () => {
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          events: currentState.events.map(({ forDate: _forDate, ...event }) =>
            event,
          ),
        }),
      TrackyDataError,
    );

    for (const missing of ['tasks', 'routines', 'routineProgress'] as const) {
      assert.throws(
        () => parseAndMigrateTrackyData({ ...currentState, [missing]: undefined }),
        TrackyDataError,
      );
    }
  });

  test('invalid tracker schedules are rejected', () => {
    const valid = currentState.trackers[0].schedule;
    const invalidSchedules = [
      { ...valid, time: '24:00' },
      { ...valid, durationMinutes: 0 },
      { ...valid, recurrence: { frequency: 'daily', interval: 0 } },
      {
        ...valid,
        recurrence: { frequency: 'weekly', interval: 1, weekdays: [] },
      },
      {
        ...valid,
        recurrence: { frequency: 'weekly', interval: 1, weekdays: [1, 1] },
      },
      {
        ...valid,
        exceptions: [
          { date: '2026-07-23', behavior: 'skip' },
          { date: '2026-07-23', behavior: 'include' },
        ],
      },
    ];

    for (const schedule of invalidSchedules) {
      assert.throws(
        () =>
          parseAndMigrateTrackyData({
            ...currentState,
            trackers: [{ ...currentState.trackers[0], schedule }],
          }),
        TrackyDataError,
      );
    }
  });

  test('invalid task placement and duration are rejected', () => {
    for (const task of [
      { ...currentState.tasks[0], scheduledDate: '2026-02-30' },
      { ...currentState.tasks[0], time: '08:60' },
      { ...currentState.tasks[0], durationMinutes: -1 },
      { ...currentState.tasks[0], dayPart: 'overnight' },
    ]) {
      assert.throws(
        () => parseAndMigrateTrackyData({ ...currentState, tasks: [task] }),
        TrackyDataError,
      );
    }
  });

  test('routine runs are unique per date and retain self-contained snapshots', () => {
    assert.deepEqual(
      parseAndMigrateTrackyData(currentState).state.routineProgress[0].steps,
      currentState.routineProgress[0].steps,
    );

    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          routines: [{ ...currentState.routines[0], steps: [] }],
        }),
      TrackyDataError,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          routineProgress: [
            { ...currentState.routineProgress[0], steps: [] },
          ],
        }),
      TrackyDataError,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          routineProgress: [
            ...currentState.routineProgress,
            { ...currentState.routineProgress[0], id: 'duplicate_run' },
          ],
        }),
      TrackyDataError,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          routineProgress: [
            { ...currentState.routineProgress[0], routineId: 'missing_routine' },
          ],
        }),
      TrackyDataError,
    );
    assert.throws(
      () =>
        parseAndMigrateTrackyData({
          ...currentState,
          routineProgress: [
            {
              ...currentState.routineProgress[0],
              completedAt: '2026-07-21T06:40:00.000Z',
            },
          ],
        }),
      TrackyDataError,
    );
  });

  test('overlapping activity intervals are rejected', () => {
    const overlappingState: PersistedTrackyState = {
      ...currentState,
      activities: [
        ...currentState.activities,
        {
          ...currentState.activities[0],
          id: 'activity_overlap',
          startedAt: '2026-07-21T10:30:00.000Z',
          endedAt: '2026-07-21T11:30:00.000Z',
        },
      ],
    };

    assert.throws(
      () => parseAndMigrateTrackyData(overlappingState),
      (error: unknown) =>
        error instanceof TrackyDataError &&
        error.message === 'Activity times overlap',
    );
  });

  test('adjacent activity intervals remain valid', () => {
    const adjacentState: PersistedTrackyState = {
      ...currentState,
      activities: [
        ...currentState.activities,
        {
          ...currentState.activities[0],
          id: 'activity_adjacent',
          startedAt: '2026-07-21T11:00:00.000Z',
          endedAt: '2026-07-21T12:00:00.000Z',
        },
      ],
    };

    assert.deepEqual(
      parseAndMigrateTrackyData(adjacentState).state,
      adjacentState,
    );
  });

  test('rollback verification failure is reported explicitly', async () => {
    const replacement: PersistedTrackyState = {
      ...currentState,
      trackers: [],
      events: [],
    };
    const storage = new MemoryStorage(JSON.stringify(currentState));
    storage.setItem = async () => {
      storage.writes += 1;
      storage.value = '{}';
    };

    await assert.rejects(
      replaceStoredTrackyData({
        fallbackCurrentState: currentState,
        key: 'tracky.v1',
        replacement,
        storage,
      }),
      TrackyRollbackError,
    );
  });
});

describe('Tracky persistence queue', () => {
  test('replacement blocks stale autosaves until imported state commits', async () => {
    const queue = new TrackyPersistenceQueue();
    let releaseReplacement: (() => void) | undefined;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    let stored = 'before';
    let staleSaveRan = false;
    let committed = false;

    const replacement = queue.replace(
      async () => {
        await replacementGate;
        stored = 'imported';
        return 'imported';
      },
      (value) => {
        committed = true;
        assert.equal(value, 'imported');
      },
    );
    const staleSave = queue.enqueueSave(async () => {
      staleSaveRan = true;
      stored = 'stale';
    });
    releaseReplacement?.();
    await Promise.all([replacement, staleSave]);

    assert.equal(staleSaveRan, false);
    assert.equal(committed, true);
    assert.equal(stored, 'imported');
  });

  test('failed replacement flushes the latest suppressed save', async () => {
    const queue = new TrackyPersistenceQueue();
    let releaseReplacement: (() => void) | undefined;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    let stored = 'before';

    const replacement = queue.replace(
      async () => {
        await replacementGate;
        throw new Error('replacement failed');
      },
      () => {
        assert.fail('A failed replacement must not commit');
      },
    );
    const suppressedSave = queue.enqueueSave(async () => {
      stored = 'latest in-memory state';
    });
    releaseReplacement?.();

    await assert.rejects(replacement, /replacement failed/);
    await suppressedSave;
    assert.equal(stored, 'latest in-memory state');
  });

  test('save chained from a discarded save runs after successful replacement', async () => {
    const queue = new TrackyPersistenceQueue();
    let releaseReplacement: (() => void) | undefined;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const writes: string[] = [];

    const replacement = queue.replace(
      async () => {
        await replacementGate;
        writes.push('replacement');
      },
      () => undefined,
    );
    const suppressed = queue.enqueueSave(async () => {
      writes.push('suppressed');
    });
    const chained = suppressed.then(() =>
      queue.enqueueSave(async () => {
        writes.push('chained');
      }),
    );
    releaseReplacement?.();

    await Promise.all([replacement, chained]);
    assert.deepEqual(writes, ['replacement', 'chained']);
  });

  test('save chained from a flushed save runs after failed replacement', async () => {
    const queue = new TrackyPersistenceQueue();
    let releaseReplacement: (() => void) | undefined;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const writes: string[] = [];

    const replacement = queue.replace(
      async () => {
        await replacementGate;
        writes.push('replacement failed');
        throw new Error('replacement failed');
      },
      () => assert.fail('A failed replacement must not commit'),
    );
    const suppressed = queue.enqueueSave(async () => {
      writes.push('flushed');
    });
    const chained = suppressed.then(() =>
      queue.enqueueSave(async () => {
        writes.push('chained');
      }),
    );
    releaseReplacement?.();

    await assert.rejects(replacement, /replacement failed/);
    await chained;
    assert.deepEqual(writes, [
      'replacement failed',
      'flushed',
      'chained',
    ]);
  });

  test('a chained replacement keeps later saves suppressed', async () => {
    const queue = new TrackyPersistenceQueue();
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const writes: string[] = [];

    const first = queue.replace(
      async () => {
        await firstGate;
        writes.push('first');
      },
      () => undefined,
    );
    const deferredSave = queue.enqueueSave(async () => {
      writes.push('discarded by first');
    });
    const second = deferredSave.then(() =>
      queue.replace(
        async () => {
          await secondGate;
          writes.push('second');
        },
        () => undefined,
      ),
    );

    releaseFirst?.();
    await first;
    const deferredDuringSecond = queue.enqueueSave(async () => {
      writes.push('discarded by second');
    });
    releaseSecond?.();
    await Promise.all([second, deferredDuringSecond]);

    assert.deepEqual(writes, ['first', 'second']);
  });
});
