import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  newTrackerDraft,
  simplifiedTrackerDraft,
} from '../src/domain/trackerDraft';

test('the simplified tracker model keeps one optional time and no hidden schedule choices', () => {
  const draft = newTrackerDraft();
  const simplified = simplifiedTrackerDraft({
    ...draft,
    schedule: {
      ...draft.schedule,
      recurrence: {
        frequency: 'weekly',
        interval: 2,
        weekdays: [1, 3, 5],
      },
      time: '14:15',
    },
  });

  assert.equal(simplified.schedule.time, '14:15');
  assert.deepEqual(simplified.schedule.recurrence, {
    frequency: 'daily',
    interval: 1,
  });
});

test('a tracker can remain untimed', () => {
  const draft = newTrackerDraft();
  const simplified = simplifiedTrackerDraft({
    ...draft,
    schedule: { ...draft.schedule, time: null },
  });

  assert.equal(simplified.schedule.time, null);
});
