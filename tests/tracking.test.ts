import assert from 'node:assert/strict';
import test from 'node:test';

import {
  currentStreak,
  localDateKey,
} from '../src/domain/tracking';

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
