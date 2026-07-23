import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';

export function Icon({
  icon,
  color,
  size = 22,
  strokeWidth = 1.8,
}: {
  icon: IconSvgElement;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <HugeiconsIcon
      absoluteStrokeWidth
      color={color}
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
