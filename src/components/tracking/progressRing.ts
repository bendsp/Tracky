/**
 * Beyond this many segments the arcs get too short to read, so the ring falls
 * back to a single continuous arc showing the same proportion.
 */
export const MAX_RING_SEGMENTS = 12;

/**
 * Lays out the ring around a tracker icon: one segment per required check-in in
 * the current goal period, filled as they're logged.
 *
 * Segments tile the circle exactly — `dash + gap` always equals one segment's
 * share of the circumference — so the ring stays balanced at any target count.
 * A goal of 1 draws an unbroken circle; a single segment with a gap in it would
 * just look like a rendering bug.
 *
 * Kept free of React Native imports so it stays unit-testable.
 */
export function progressRingGeometry({
  count,
  size,
  strokeWidth,
  target,
}: {
  count: number;
  size: number;
  strokeWidth: number;
  target: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const wholeTarget = Math.max(1, Math.floor(target));
  const segments = Math.min(wholeTarget, MAX_RING_SEGMENTS);
  const segmented = wholeTarget > 1 && wholeTarget <= MAX_RING_SEGMENTS;
  const filled = Math.max(0, Math.min(count, wholeTarget));

  const unit = circumference / segments;
  // A round cap extends a dash by strokeWidth/2 at each end, so the gap has to
  // clear the stroke before any of it is visible at all.
  const gap = segmented ? Math.max(strokeWidth * 2.2, unit * 0.16) : 0;
  const dash = Math.max(strokeWidth / 2, unit - gap);

  return {
    circumference,
    dash,
    filled,
    gap,
    progress: filled / wholeTarget,
    radius,
    segmented,
    segments,
    unit,
  };
}
