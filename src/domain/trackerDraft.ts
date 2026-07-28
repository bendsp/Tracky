import { defaultHabitColor, normalizeHabitColor } from '../design/theme';
import type { Tracker, TrackerDraft } from './models';
import { localDateKey } from './tracking';

export function baseTrackerSummary(): TrackerDraft['summary'] {
  return {
    calculation: 'count',
    timeframe: 'today',
    countLabel: 'check-ins',
  };
}

export function newTrackerDraft(): TrackerDraft {
  return {
    name: '',
    icon: 'star',
    color: defaultHabitColor,
    goal: {
      targetCount: 1,
      period: 'day',
      startDate: localDateKey(new Date()),
    },
    fields: [],
    summary: baseTrackerSummary(),
  };
}

export function editableTrackerDraft(tracker: Tracker): TrackerDraft {
  return {
    name: tracker.name,
    icon: tracker.icon,
    color: normalizeHabitColor(tracker.color),
    goal: { ...tracker.goal },
    fields: tracker.fields.map((field) =>
      field.type === 'choice'
        ? { ...field, choices: [...field.choices] }
        : { ...field },
    ),
    summary: { ...tracker.summary },
  };
}
