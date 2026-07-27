import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultHabitColor,
  neutralHabitColor,
  normalizeHabitColor,
  resolveHabitColor,
} from '../src/design/theme';

test('uses semantic neutral as the default habit color', () => {
  assert.equal(defaultHabitColor, neutralHabitColor);
  assert.equal(normalizeHabitColor('#292929'), neutralHabitColor);
});

test('renders neutral with theme contrast while preserving chosen colors', () => {
  assert.equal(resolveHabitColor(neutralHabitColor, true), '#FAFAFA');
  assert.equal(resolveHabitColor(neutralHabitColor, false), '#292929');
  assert.equal(resolveHabitColor('#0A84FF', true), '#0A84FF');
  assert.equal(resolveHabitColor('#0A84FF', false), '#0A84FF');
});
