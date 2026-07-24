import {
  BookOpen01Icon,
  Coffee02Icon,
  ComputerIcon,
  DropletIcon,
  FavouriteIcon,
  Leaf01Icon,
  MusicNote01Icon,
  Restaurant01Icon,
  SleepingIcon,
  SparklesIcon,
  WorkoutRunIcon,
  Yoga01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

import type { TrackerIconName } from '../../domain/models';
import { Icon } from '../Icon';

const icons: Record<TrackerIconName, IconSvgElement> = {
  droplet: DropletIcon,
  meditation: Yoga01Icon,
  coffee: Coffee02Icon,
  activity: WorkoutRunIcon,
  heart: FavouriteIcon,
  book: BookOpen01Icon,
  leaf: Leaf01Icon,
  star: SparklesIcon,
  computer: ComputerIcon,
  food: Restaurant01Icon,
  music: MusicNote01Icon,
  sleep: SleepingIcon,
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
  { label: 'Computer', value: 'computer' },
  { label: 'Food', value: 'food' },
  { label: 'Music', value: 'music' },
  { label: 'Sleep', value: 'sleep' },
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
