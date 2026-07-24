import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createTrackerTemplateDraft,
  trackerTemplateOptions,
} from '../src/domain/trackerTemplates';
import { sanitizeTrackerDraft } from '../src/storage/trackyData';

function sequentialIds() {
  let index = 0;
  return () => `field_${++index}`;
}

describe('tracker templates', () => {
  test('exposes exactly the approved gateway examples', () => {
    assert.deepEqual(
      trackerTemplateOptions.map(({ id, name }) => ({ id, name })),
      [
        { id: 'water', name: 'Water' },
        { id: 'workouts', name: 'Workouts' },
        { id: 'reading', name: 'Reading' },
      ],
    );
  });

  test('water prefills an editable daily amount total', () => {
    const draft = createTrackerTemplateDraft('water', sequentialIds());

    assert.equal(draft.name, 'Water');
    assert.equal(draft.icon, 'droplet');
    assert.deepEqual(draft.fields, [
      {
        id: 'field_1',
        name: 'Amount',
        type: 'number',
        unit: 'ml',
      },
    ]);
    assert.deepEqual(draft.summary, {
      calculation: 'sum',
      timeframe: 'today',
      fieldId: 'field_1',
    });
    assert.ok(sanitizeTrackerDraft(draft));
  });

  test('workouts prefills a weekly count and editable workout choices', () => {
    const draft = createTrackerTemplateDraft('workouts', sequentialIds());

    assert.equal(draft.name, 'Workouts');
    assert.equal(draft.icon, 'activity');
    assert.deepEqual(draft.fields, [
      {
        id: 'field_1',
        name: 'Workout type',
        type: 'choice',
        choices: ['Strength', 'Cardio', 'Mobility'],
      },
    ]);
    assert.deepEqual(draft.summary, {
      calculation: 'count',
      timeframe: 'thisWeek',
      countLabel: 'workouts',
    });
    assert.ok(sanitizeTrackerDraft(draft));
  });

  test('reading prefills a weekly session count with optional pages', () => {
    const draft = createTrackerTemplateDraft('reading', sequentialIds());

    assert.equal(draft.name, 'Reading');
    assert.equal(draft.icon, 'book');
    assert.deepEqual(draft.fields, [
      {
        id: 'field_1',
        name: 'Pages',
        type: 'number',
        unit: 'pages',
      },
    ]);
    assert.deepEqual(draft.summary, {
      calculation: 'count',
      timeframe: 'thisWeek',
      countLabel: 'sessions',
    });
    assert.ok(sanitizeTrackerDraft(draft));
  });
});
