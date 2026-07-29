import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_RING_SEGMENTS,
  progressRingGeometry,
} from '../src/components/tracking/progressRing';

const ROW = { size: 56, strokeWidth: 3 };
const HERO = { size: 116, strokeWidth: 5 };

test('a goal of one draws an unbroken circle', () => {
  const ring = progressRingGeometry({ ...ROW, count: 0, target: 1 });
  assert.equal(ring.segmented, false);
  assert.equal(ring.segments, 1);
  assert.equal(ring.gap, 0);
  assert.equal(ring.dash, ring.circumference);
});

test('segments tile the circle exactly', () => {
  for (const target of [2, 3, 5, 8, MAX_RING_SEGMENTS]) {
    for (const geometry of [ROW, HERO]) {
      const ring = progressRingGeometry({ ...geometry, count: 0, target });
      assert.equal(ring.segments, target);
      assert.ok(ring.segmented, `target ${target} should be segmented`);
      // dash + gap covering each segment must sum back to the full circle.
      assert.ok(
        Math.abs(ring.dash + ring.gap - ring.unit) < 1e-9,
        `target ${target} at size ${geometry.size} does not tile`,
      );
      assert.ok(
        Math.abs(ring.unit * ring.segments - ring.circumference) < 1e-9,
        `target ${target} at size ${geometry.size} leaves a remainder`,
      );
    }
  }
});

test('gaps stay visible once round caps eat into them', () => {
  // A round cap adds strokeWidth/2 at each end, so a gap only reads as a gap
  // when it exceeds the stroke width.
  for (const target of [2, 3, 8, MAX_RING_SEGMENTS]) {
    for (const geometry of [ROW, HERO]) {
      const ring = progressRingGeometry({ ...geometry, count: 0, target });
      assert.ok(
        ring.gap > geometry.strokeWidth,
        `target ${target} at size ${geometry.size} has an invisible gap`,
      );
      assert.ok(ring.dash > 0, `target ${target} has a non-positive dash`);
    }
  }
});

test('filled segments track the check-in count', () => {
  const ring = (count: number) =>
    progressRingGeometry({ ...ROW, count, target: 3 });

  assert.equal(ring(0).filled, 0);
  assert.equal(ring(1).filled, 1);
  assert.equal(ring(3).filled, 3);
});

test('over- and under-shooting the goal is clamped', () => {
  // Logging past the target must not draw more segments than exist.
  assert.equal(progressRingGeometry({ ...ROW, count: 9, target: 3 }).filled, 3);
  assert.equal(progressRingGeometry({ ...ROW, count: 9, target: 3 }).progress, 1);
  assert.equal(progressRingGeometry({ ...ROW, count: -2, target: 3 }).filled, 0);
});

test('large targets fall back to a continuous proportional arc', () => {
  const ring = progressRingGeometry({
    ...ROW,
    count: 10,
    target: MAX_RING_SEGMENTS + 8,
  });
  assert.equal(ring.segmented, false);
  assert.equal(ring.progress, 10 / (MAX_RING_SEGMENTS + 8));
});

test('a zero or fractional target degrades to a single ring', () => {
  for (const target of [0, 0.5, 1.5]) {
    const ring = progressRingGeometry({ ...ROW, count: 1, target });
    assert.equal(ring.segments, 1);
    assert.equal(ring.segmented, false);
    assert.ok(Number.isFinite(ring.progress));
  }
});
