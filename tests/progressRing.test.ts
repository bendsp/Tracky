import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_RING_SEGMENTS,
  progressRingGeometry,
  ringStrokeWidth,
} from '../src/components/tracking/progressRing';

/** The two sizes the app actually renders. */
const ROW = { size: 56 };
const HERO = { size: 116 };

test('every ring is proportionally the same thickness', () => {
  const row = progressRingGeometry({ ...ROW, count: 0, target: 3 });
  const hero = progressRingGeometry({ ...HERO, count: 0, target: 3 });

  assert.ok(
    Math.abs(
      row.strokeWidth / ROW.size - hero.strokeWidth / HERO.size,
    ) < 1e-9,
    `list ring is ${row.strokeWidth / ROW.size} of its diameter, hero is ${
      hero.strokeWidth / HERO.size
    }`,
  );
  // The bigger ring still has to be physically thicker, not just in ratio.
  assert.ok(hero.strokeWidth > row.strokeWidth);
});

test('ring geometry is scale-invariant', () => {
  // Both terms of the gap formula scale with size, so a ring drawn at any
  // diameter is the same shape — not merely a similar one. This is the whole
  // reason stroke width is derived rather than passed in per call site.
  for (const target of [2, 3, 5, MAX_RING_SEGMENTS]) {
    const row = progressRingGeometry({ ...ROW, count: 0, target });
    const hero = progressRingGeometry({ ...HERO, count: 0, target });

    for (const key of ['dash', 'gap', 'startOffset', 'unit'] as const) {
      assert.ok(
        Math.abs(row[key] / row.circumference - hero[key] / hero.circumference) <
          1e-9,
        `target ${target}: ${key} is not scale-invariant (${
          row[key] / row.circumference
        } vs ${hero[key] / hero.circumference})`,
      );
    }
  }
});

test('the derived stroke is thicker than the old fixed widths', () => {
  // Guards the "make the rings thicker" decision against a silent revert.
  assert.ok(ringStrokeWidth(56) > 3);
  assert.ok(ringStrokeWidth(116) > 5);
});

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

test('a gap is centred on 12 o’clock', () => {
  for (const target of [2, 3, 4, 5, 8, MAX_RING_SEGMENTS]) {
    for (const geometry of [ROW, HERO]) {
      const ring = progressRingGeometry({ ...geometry, count: 0, target });
      // Segment i spans [startOffset + i*unit, startOffset + i*unit + dash],
      // so the gap that follows it is centred half a gap past its end.
      const gapCentres = Array.from(
        { length: ring.segments },
        (_, index) =>
          (ring.startOffset + index * ring.unit + ring.dash + ring.gap / 2) %
          ring.circumference,
      );
      // One of them must sit at the top of the circle (0, modulo the circle).
      const atTop = gapCentres.some(
        (centre) =>
          Math.min(centre, ring.circumference - centre) < 1e-9,
      );
      assert.ok(
        atTop,
        `target ${target} at size ${geometry.size} has no gap at 12 o'clock: ${gapCentres}`,
      );
    }
  }
});

test('gaps are symmetric about the vertical axis', () => {
  // The eye reads an asymmetric ring as rotated. Mirroring the gap centres
  // across the vertical axis has to reproduce the same set of centres.
  for (const target of [2, 3, 5, 7, MAX_RING_SEGMENTS]) {
    const ring = progressRingGeometry({ ...HERO, count: 0, target });
    const centres = Array.from(
      { length: ring.segments },
      (_, index) =>
        (ring.startOffset + index * ring.unit + ring.dash + ring.gap / 2) %
        ring.circumference,
    ).sort((left, right) => left - right);

    const mirrored = centres
      .map((centre) => (ring.circumference - centre) % ring.circumference)
      .sort((left, right) => left - right);

    centres.forEach((centre, index) => {
      assert.ok(
        Math.abs(centre - mirrored[index]) < 1e-6,
        `target ${target} is not symmetric: ${centres} vs ${mirrored}`,
      );
    });
  }
});

test('gaps stay visible once round caps eat into them', () => {
  // A round cap adds strokeWidth/2 at each end, so a gap only reads as a gap
  // when it exceeds the stroke width.
  for (const target of [2, 3, 8, MAX_RING_SEGMENTS]) {
    for (const geometry of [ROW, HERO]) {
      const ring = progressRingGeometry({ ...geometry, count: 0, target });
      assert.ok(
        ring.gap > ringStrokeWidth(geometry.size),
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
