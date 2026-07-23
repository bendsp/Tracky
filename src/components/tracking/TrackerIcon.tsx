import {
  Activity01Icon,
  BookOpen01Icon,
  Coffee02Icon,
  DropletIcon,
  FavouriteIcon,
  Leaf01Icon,
  SparklesIcon,
  Yoga01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

import type { TrackerIconName } from '../../domain/models';
import { Icon } from '../Icon';

const icons: Record<TrackerIconName, IconSvgElement> = {
  droplet: DropletIcon,
  meditation: Yoga01Icon,
  coffee: Coffee02Icon,
  activity: Activity01Icon,
  heart: FavouriteIcon,
  book: BookOpen01Icon,
  leaf: Leaf01Icon,
  star: SparklesIcon,
};

export const trackerIconOptions: {
  label: string;
  value: TrackerIconName;
}[] = [
  { label: 'Water', value: 'droplet' },
  { label: 'Meditation', value: 'meditation' },
  { label: 'Coffee', value: 'coffee' },
  { label: 'Activity', value: 'activity' },
  { label: 'Heart', value: 'heart' },
  { label: 'Reading', value: 'book' },
  { label: 'Nature', value: 'leaf' },
  { label: 'General', value: 'star' },
];

export function TrackerIcon({
  color,
  name,
  size = 24,
}: {
  color: string;
  name: TrackerIconName;
  size?: number;
}) {
  return <Icon color={color} icon={icons[name]} size={size} strokeWidth={1.9} />;
}
