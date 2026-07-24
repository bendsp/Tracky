import { activityAccents } from '../design/theme';
import type {
  TrackerDraft,
  TrackerField,
  TrackerIconName,
} from './models';

export type TrackerTemplateId = 'water' | 'workouts' | 'reading';

export type TrackerTemplateOption = {
  color: string;
  id: TrackerTemplateId;
  icon: TrackerIconName;
  name: string;
};

function accentNamed(label: (typeof activityAccents)[number]['label']) {
  const accent = activityAccents.find((option) => option.label === label);
  if (!accent) throw new Error(`Missing tracker template accent: ${label}`);
  return accent.value;
}

const templateColors = {
  water: accentNamed('Blue'),
  workouts: accentNamed('Coral'),
  reading: accentNamed('Green'),
} satisfies Record<TrackerTemplateId, string>;

export const trackerTemplateOptions: readonly TrackerTemplateOption[] = [
  {
    color: templateColors.water,
    id: 'water',
    icon: 'droplet',
    name: 'Water',
  },
  {
    color: templateColors.workouts,
    id: 'workouts',
    icon: 'activity',
    name: 'Workouts',
  },
  {
    color: templateColors.reading,
    id: 'reading',
    icon: 'book',
    name: 'Reading',
  },
];

function defaultFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTrackerTemplateDraft(
  templateId: TrackerTemplateId,
  createFieldId: () => string = defaultFieldId,
): TrackerDraft {
  if (templateId === 'water') {
    const amountFieldId = createFieldId();
    return {
      name: 'Water',
      icon: 'droplet',
      color: templateColors.water,
      fields: [
        {
          id: amountFieldId,
          name: 'Amount',
          type: 'number',
          unit: 'ml',
        },
      ],
      summary: {
        calculation: 'sum',
        timeframe: 'today',
        fieldId: amountFieldId,
      },
    };
  }

  if (templateId === 'workouts') {
    const workoutTypeField: TrackerField = {
      id: createFieldId(),
      name: 'Workout type',
      type: 'choice',
      choices: ['Strength', 'Cardio', 'Mobility'],
    };
    return {
      name: 'Workouts',
      icon: 'activity',
      color: templateColors.workouts,
      fields: [workoutTypeField],
      summary: {
        calculation: 'count',
        timeframe: 'thisWeek',
        countLabel: 'workouts',
      },
    };
  }

  const pagesField: TrackerField = {
    id: createFieldId(),
    name: 'Pages',
    type: 'number',
    unit: 'pages',
  };
  return {
    name: 'Reading',
    icon: 'book',
    color: templateColors.reading,
    fields: [pagesField],
    summary: {
      calculation: 'count',
      timeframe: 'thisWeek',
      countLabel: 'sessions',
    },
  };
}
