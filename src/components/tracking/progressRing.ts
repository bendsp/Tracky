/**
 * Beyond this many segments the arcs get too short to read, so the ring falls
 * back to a single continuous arc showing the same proportion.
 */
export const MAX_RING_SEGMENTS = 12;

/**
 * Ring thickness as a fraction of the icon's diameter. Deriving it means a
 * 56pt list ring and a 116pt hero ring read as equally thick instead of the
 * hero looking thinner, which is what happens when both are given a fixed
 * pixel width.
 */
export const RING_STROKE_RATIO = 0.075;

export function ringStrokeWidth(size: number) {
  return size * RING_STROKE_RATIO;
}

/**
 * Icon diameter as a fraction of the ring's. Derived for the same reason the
 * stroke is: hand-set sizes drifted to 52% in list rows but 38% in the detail
 * hero, which left the hero icon floating in dead space.
 */
export const RING_ICON_RATIO = 0.5;

export function ringIconSize(size: number) {
  return Math.round(size * RING_ICON_RATIO);
}

/**
 * The two sizes Tracky draws a tracker ring at. The ring is the primary read on
 * both screens, so it's sized as large as its container allows.
 */
export const RING_SIZE = {
  /**
   * Tracker list rows. The largest ring that still fits the 92pt row — going
   * further grows every row and costs a tracker off the first screen, and eats
   * into the ~188pt the tracker name has to work with.
   */
  row: 64,
  /** The tracker detail hero, which has room to spare. */
  hero: 132,
} as const;

/**
 * Lays out the ring around a tracker icon: one segment per required check-in in
 * the current goal period, filled as they're logged.
 *
 * Segments tile the circle exactly — `dash + gap` always equals one segment's
 * share of the circumference — so the ring stays balanced at any target count.
 * A goal of 1 draws an unbroken circle; a single segment with a gap in it would
 * just look like a rendering bug.
 *
 * The pattern is shifted by half a gap (`startOffset`) so that gap *centres*
 * land on exact multiples of `unit`, one of which is 12 o'clock. Without it the
 * first segment's leading edge sits at the top instead, which pushes every gap
 * half a gap counter-clockwise and makes the whole ring look rotated.
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
  /** Defaults to `ringStrokeWidth(size)`; only pass it in tests. */
  strokeWidth?: number;
  target: number;
}) {
  const stroke = strokeWidth ?? ringStrokeWidth(size);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const wholeTarget = Math.max(1, Math.floor(target));
  const segments = Math.min(wholeTarget, MAX_RING_SEGMENTS);
  const segmented = wholeTarget > 1 && wholeTarget <= MAX_RING_SEGMENTS;
  const filled = Math.max(0, Math.min(count, wholeTarget));

  const unit = circumference / segments;
  // A round cap extends a dash by stroke/2 at each end, so the gap has to clear
  // the stroke before any of it is visible at all.
  const gap = segmented ? Math.max(stroke * 2.2, unit * 0.16) : 0;
  const dash = Math.max(stroke / 2, unit - gap);

  return {
    circumference,
    dash,
    filled,
    gap,
    strokeWidth: stroke,
    progress: filled / wholeTarget,
    radius,
    segmented,
    segments,
    /** Distance along the path where the first segment begins. */
    startOffset: gap / 2,
    unit,
  };
}
