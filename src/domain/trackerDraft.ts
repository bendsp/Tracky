import { defaultHabitColor, normalizeHabitColor } from '../design/theme';
import type { DaySchedule, Tracker, TrackerDraft } from './models';
import { dayPartForTime, defaultDaySchedule } from './planning';
import { localDateKey } from './tracking';

export function simplifiedTrackerSchedule(
  schedule: DaySchedule,
  time = schedule.time,
): DaySchedule {
  return {
    ...schedule,
    dayPart: time ? dayPartForTime(time) : 'anytime',
    durationMinutes: null,
    recurrence: { frequency: 'daily', interval: 1 },
    time,
  };
}

export function simplifiedTrackerDraft(draft: TrackerDraft): TrackerDraft {
  return {
    ...draft,
    schedule: simplifiedTrackerSchedule(draft.schedule),
  };
}

export function baseTrackerSummary(): TrackerDraft['summary'] {
  return {
    calculation: 'count',
    timeframe: 'today',
    countLabel: 'check-ins',
  };
}

export function newTrackerDraft(): TrackerDraft {
  const startDate = localDateKey(new Date());
  return {
    name: '',
    icon: 'star',
    color: defaultHabitColor,
    goal: {
      targetCount: 1,
      period: 'day',
      startDate,
    },
    schedule: defaultDaySchedule(startDate),
    fields: [],
    summary: baseTrackerSummary(),
  };
}

export function editableTrackerDraft(tracker: Tracker): TrackerDraft {
  return simplifiedTrackerDraft({
    name: tracker.name,
    icon: tracker.icon,
    color: normalizeHabitColor(tracker.color),
    goal: { ...tracker.goal },
    schedule: {
      ...tracker.schedule,
      exceptions: tracker.schedule.exceptions.map((exception) => ({
        ...exception,
      })),
      recurrence: tracker.schedule.recurrence.frequency === 'weekly'
        ? {
            ...tracker.schedule.recurrence,
            weekdays: [...tracker.schedule.recurrence.weekdays],
          }
        : { ...tracker.schedule.recurrence },
    },
    fields: tracker.fields.map((field) =>
      field.type === 'choice'
        ? { ...field, choices: [...field.choices] }
        : { ...field },
    ),
    summary: { ...tracker.summary },
  });
}
