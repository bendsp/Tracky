import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { progressRingGeometry } from './progressRing';

/**
 * The ring around a tracker icon: one segment per required check-in in the
 * current goal period, filled in the tracker's colour as they're logged.
 * See `progressRing.ts` for the geometry.
 */
export function TrackerProgressRing({
  children,
  color,
  count,
  size,
  strokeWidth = 3,
  target,
  trackColor,
}: PropsWithChildren<{
  color: string;
  count: number;
  size: number;
  strokeWidth?: number;
  target: number;
  trackColor: string;
}>) {
  const {
    circumference,
    dash,
    filled,
    progress,
    radius,
    segmented,
    segments,
    unit,
  } = progressRingGeometry({ count, size, strokeWidth, target });

  const shared = {
    cx: size / 2,
    cy: size / 2,
    fill: 'none',
    r: radius,
    strokeLinecap: 'round' as const,
    strokeWidth,
  };

  return (
    <View style={[styles.container, { height: size, width: size }]}>
      <Svg
        height={size}
        // Rotated so the ring starts at 12 o'clock and runs clockwise.
        style={[StyleSheet.absoluteFill, styles.ring]}
        width={size}
      >
        {segmented ? (
          Array.from({ length: segments }, (_, index) => (
            <Circle
              {...shared}
              key={index}
              stroke={index < filled ? color : trackColor}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-index * unit}
            />
          ))
        ) : (
          <>
            <Circle {...shared} stroke={trackColor} />
            {progress > 0 ? (
              <Circle
                {...shared}
                stroke={color}
                strokeDasharray={`${circumference * progress} ${circumference}`}
              />
            ) : null}
          </>
        )}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { transform: [{ rotate: '-90deg' }] },
});
