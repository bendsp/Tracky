import assert from 'node:assert/strict';
import test from 'node:test';

import { trackerIconNames } from '../src/domain/models';
import {
  describePresetGoal,
  presetDraft,
  trackerPresets,
} from '../src/domain/trackerPresets';
import { sanitizeTrackerDraft } from '../src/storage/trackyData';

test('every preset has a unique id and name', () => {
  const ids = trackerPresets.map((preset) => preset.id);
  const names = trackerPresets.map((preset) => preset.name);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(names).size, names.length);
});

test('every preset uses a real tracker icon', () => {
  for (const preset of trackerPresets) {
    assert.ok(
      (trackerIconNames as readonly string[]).includes(preset.icon),
      `${preset.id} uses unknown icon "${preset.icon}"`,
    );
  }
});

test('preset drafts survive the same sanitizer as user-made trackers', () => {
  // Presets are ordinary drafts — if one couldn't round-trip the sanitizer it
  // would silently create a tracker that differs from what was tapped.
  for (const preset of trackerPresets) {
    const draft = presetDraft(preset);
    const clean = sanitizeTrackerDraft(draft);

    // A null here means tapping the preset would silently create nothing.
    assert.ok(clean, `${preset.id} was rejected by the sanitizer`);
    assert.equal(clean.name, preset.name, `${preset.id} lost its name`);
    assert.equal(clean.icon, preset.icon, `${preset.id} lost its icon`);
    assert.equal(
      clean.goal.targetCount,
      preset.targetCount,
      `${preset.id} lost its target`,
    );
    assert.equal(
      clean.goal.period,
      preset.period,
      `${preset.id} lost its period`,
    );
  }
});

test('preset goals read as sentences', () => {
  const daily = trackerPresets.find((preset) => preset.id === 'read');
  const water = trackerPresets.find((preset) => preset.id === 'water');
  const weekly = trackerPresets.find((preset) => preset.id === 'workout');

  assert.ok(daily && water && weekly);
  assert.equal(describePresetGoal(daily), 'Every day');
  assert.equal(describePresetGoal(water), '8 times a day');
  assert.equal(describePresetGoal(weekly), '3 times a week');
});
