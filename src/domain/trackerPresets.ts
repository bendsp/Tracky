import { habitColors } from '../design/theme';
import type { TrackerDraft, TrackerGoalPeriod, TrackerIconName } from './models';
import { newTrackerDraft } from './trackerDraft';

export type TrackerPreset = {
  color: `#${string}`;
  icon: TrackerIconName;
  id: string;
  name: string;
  period: TrackerGoalPeriod;
  targetCount: number;
};

const color = (label: (typeof habitColors)[number]['label']) => {
  const match = habitColors.find((option) => option.label === label);
  if (!match) throw new Error(`Unknown habit color: ${label}`);
  return match.value;
};

/**
 * First-launch starting points. A habit tracker's real onboarding problem is
 * the blank page, so these exist to get a real tracker into the list on the
 * first screen rather than to explain the app.
 *
 * They're ordinary drafts — nothing here is a special kind of tracker, so
 * anything created this way is editable and deletable like any other.
 */
export const trackerPresets: TrackerPreset[] = [
  {
    id: 'water',
    name: 'Drink water',
    icon: 'droplet',
    color: color('Blue'),
    targetCount: 8,
    period: 'day',
  },
  {
    id: 'read',
    name: 'Read',
    icon: 'book',
    color: color('Indigo'),
    targetCount: 1,
    period: 'day',
  },
  {
    id: 'meditate',
    name: 'Meditate',
    icon: 'meditation',
    color: color('Mint'),
    targetCount: 1,
    period: 'day',
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: 'activity',
    color: color('Lime'),
    targetCount: 3,
    period: 'week',
  },
  {
    id: 'walk',
    name: 'Walk outside',
    icon: 'leaf',
    color: color('Green'),
    targetCount: 1,
    period: 'day',
  },
  {
    id: 'sleep',
    name: 'Sleep early',
    icon: 'sleep',
    color: color('Violet'),
    targetCount: 1,
    period: 'day',
  },
];

/** "Every day", "8 times a day", "3 times a week". */
export function describePresetGoal(preset: TrackerPreset) {
  if (preset.targetCount === 1) return `Every ${preset.period}`;
  return `${preset.targetCount} times a ${preset.period}`;
}

export function presetDraft(preset: TrackerPreset): TrackerDraft {
  const draft = newTrackerDraft();
  return {
    ...draft,
    color: preset.color,
    icon: preset.icon,
    name: preset.name,
    goal: {
      ...draft.goal,
      period: preset.period,
      targetCount: preset.targetCount,
    },
  };
}
