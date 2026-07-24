import { activityAccents } from '../design/theme';
import type {
  TrackerDraft,
  TrackerField,
  TrackerIconName,
} from './models';

export type TrackerTemplateId = 'water' | 'workouts' | 'reading';

export type TrackerTemplateOption = {
  id: TrackerTemplateId;
  icon: TrackerIconName;
  name: string;
};

export const trackerTemplateOptions: readonly TrackerTemplateOption[] = [
  { id: 'water', icon: 'droplet', name: 'Water' },
  { id: 'workouts', icon: 'activity', name: 'Workouts' },
  { id: 'reading', icon: 'book', name: 'Reading' },
];

function defaultFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTrackerTemplateDraft(
  templateId: TrackerTemplateId,
  createFieldId: () => string = defaultFieldId,
): TrackerDraft {
  const color = activityAccents[0].value;

  if (templateId === 'water') {
    const amountFieldId = createFieldId();
    return {
      name: 'Water',
      icon: 'droplet',
      color,
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
      color,
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
    color,
    fields: [pagesField],
    summary: {
      calculation: 'count',
      timeframe: 'thisWeek',
      countLabel: 'sessions',
    },
  };
}
