import type {
  DayPart,
  DaySchedule,
  ISOWeekday,
  LocalDate,
  Routine,
  RoutineProgress,
  ScheduleRecurrence,
  Task,
  TrackedEvent,
  Tracker,
} from './models';
import { localDateKey, trackerGoalStatus } from './tracking';

export const dayPartLabels: Record<DayPart, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

export const dayPartOrder: DayPart[] = [
  'morning',
  'afternoon',
  'evening',
  'anytime',
];

export const weekdayLabels: Record<ISOWeekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isLocalTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function localDateAtNoon(value: LocalDate) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function localDateAtEnd(value: LocalDate) {
  const date = localDateAtNoon(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addLocalDays(value: LocalDate, amount: number): LocalDate {
  const date = localDateAtNoon(value);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function utcDayNumber(value: LocalDate) {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function isoWeekday(value: LocalDate): ISOWeekday {
  const weekday = localDateAtNoon(value).getDay();
  return (weekday === 0 ? 7 : weekday) as ISOWeekday;
}

export function dayPartForTime(time: string): Exclude<DayPart, 'anytime'> {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function defaultDaySchedule(startDate = localDateKey(new Date())): DaySchedule {
  return {
    dayPart: 'anytime',
    durationMinutes: null,
    exceptions: [],
    recurrence: { frequency: 'daily', interval: 1 },
    startDate,
    time: null,
  };
}

export function recurrenceOccursOn(
  recurrence: ScheduleRecurrence,
  startDate: LocalDate,
  date: LocalDate,
) {
  const elapsedDays = utcDayNumber(date) - utcDayNumber(startDate);
  if (elapsedDays < 0) return false;
  if (recurrence.frequency === 'daily') {
    return elapsedDays % recurrence.interval === 0;
  }

  const startWeek = utcDayNumber(startDate) - (isoWeekday(startDate) - 1);
  const dateWeek = utcDayNumber(date) - (isoWeekday(date) - 1);
  const elapsedWeeks = Math.floor((dateWeek - startWeek) / 7);
  return (
    elapsedWeeks % recurrence.interval === 0 &&
    recurrence.weekdays.includes(isoWeekday(date))
  );
}

export function scheduleOccursOn(schedule: DaySchedule, date: LocalDate) {
  if (date < schedule.startDate) return false;
  const exception = schedule.exceptions.find((item) => item.date === date);
  if (exception) return exception.behavior === 'include';
  return recurrenceOccursOn(schedule.recurrence, schedule.startDate, date);
}

export function scheduleDescription(schedule: DaySchedule) {
  let recurrence: string;
  if (schedule.recurrence.frequency === 'daily') {
    recurrence = schedule.recurrence.interval === 1
      ? 'Every day'
      : `Every ${schedule.recurrence.interval} days`;
  } else {
    const days = schedule.recurrence.weekdays;
    const prefix = schedule.recurrence.interval === 1
      ? ''
      : `Every ${schedule.recurrence.interval} weeks · `;
    recurrence = days.length === 7 && schedule.recurrence.interval === 1
      ? 'Every day'
      : `${prefix}${days.map((day) => weekdayLabels[day].slice(0, 3)).join(', ')}`;
  }
  return [
    recurrence,
    schedule.time,
    schedule.durationMinutes ? `${schedule.durationMinutes}m` : null,
  ].filter(Boolean).join(' · ');
}

export type DayPlanItem =
  | {
      id: string;
      kind: 'tracker';
      source: Tracker;
      dayPart: DayPart;
      time: string | null;
      durationMinutes: number | null;
      skipped: boolean;
      complete: boolean;
      count: number;
      target: number;
      detail: string;
    }
  | {
      id: string;
      kind: 'task';
      source: Task;
      dayPart: DayPart;
      time: string | null;
      durationMinutes: number | null;
      skipped: false;
      complete: boolean;
      count: number;
      target: 1;
      detail: string;
    }
  | {
      id: string;
      kind: 'routine';
      source: Routine;
      progress: RoutineProgress | null;
      dayPart: DayPart;
      time: string | null;
      durationMinutes: number | null;
      skipped: boolean;
      complete: boolean;
      count: number;
      target: number;
      detail: string;
    };

function displayDetail(time: string | null, durationMinutes: number | null) {
  if (time && durationMinutes) return `${time} · ${durationMinutes}m`;
  if (time) return time;
  if (durationMinutes) return `${durationMinutes}m`;
  return '';
}

function trackerPlanDetail(
  tracker: Tracker,
  status: ReturnType<typeof trackerGoalStatus>,
) {
  const periodSuffix = tracker.goal.period === 'day'
    ? ''
    : ` this ${tracker.goal.period}`;
  if (status.complete) return `Done${periodSuffix}`;
  if (status.targetCount === 1) return `Not done${periodSuffix}`;
  return `${status.count} of ${status.targetCount}${periodSuffix}`;
}

export function buildDayPlan({
  date,
  events,
  routineProgress,
  routines,
  tasks,
  trackers,
}: {
  date: LocalDate;
  events: TrackedEvent[];
  routineProgress: RoutineProgress[];
  routines: Routine[];
  tasks: Task[];
  trackers: Tracker[];
}) {
  const items: DayPlanItem[] = [];
  const endOfDay = localDateAtEnd(date);

  for (const tracker of trackers) {
    const skipped = tracker.schedule.exceptions.some(
      (exception) =>
        exception.date === date && exception.behavior === 'skip',
    );
    const hasHistory = events.some(
      (event) => event.trackerId === tracker.id && event.forDate === date,
    );
    if (
      (date < tracker.goal.startDate && !hasHistory) ||
      (!scheduleOccursOn(tracker.schedule, date) && !hasHistory && !skipped)
    ) {
      continue;
    }
    const status = trackerGoalStatus(tracker, events, endOfDay);
    items.push({
      id: `tracker:${tracker.id}`,
      kind: 'tracker',
      source: tracker,
      dayPart: tracker.schedule.dayPart,
      time: tracker.schedule.time,
      durationMinutes: tracker.schedule.durationMinutes,
      skipped,
      complete: status.complete,
      count: status.count,
      target: status.targetCount,
      detail: displayDetail(
        tracker.schedule.time,
        tracker.schedule.durationMinutes,
      ) || trackerPlanDetail(tracker, status),
    });
  }

  for (const task of tasks) {
    if (task.scheduledDate !== date) continue;
    items.push({
      id: `task:${task.id}`,
      kind: 'task',
      source: task,
      dayPart: task.dayPart,
      time: task.time,
      durationMinutes: task.durationMinutes,
      skipped: false,
      complete: task.completedAt !== null,
      count: task.completedAt ? 1 : 0,
      target: 1,
      detail: displayDetail(task.time, task.durationMinutes),
    });
  }

  for (const routine of routines) {
    const skipped = routine.schedule.exceptions.some(
      (exception) =>
        exception.date === date && exception.behavior === 'skip',
    );
    const progress = routineProgress.find(
      (item) => item.routineId === routine.id && item.forDate === date,
    ) ?? null;
    if (!scheduleOccursOn(routine.schedule, date) && !progress && !skipped) {
      continue;
    }
    const runSteps = progress?.steps ?? routine.steps.map((step) => ({
      ...step,
      completedAt: null,
    }));
    const count = runSteps.filter((step) => step.completedAt).length;
    const target = Math.max(1, runSteps.length);
    items.push({
      id: `routine:${routine.id}`,
      kind: 'routine',
      source: routine,
      progress,
      dayPart: routine.schedule.dayPart,
      time: routine.schedule.time,
      durationMinutes: routine.schedule.durationMinutes,
      skipped,
      complete: runSteps.length > 0 && count >= runSteps.length,
      count,
      target,
      detail: runSteps.length
        ? `${count} of ${runSteps.length} steps${routine.schedule.time ? ` · ${routine.schedule.time}` : ''}`
        : 'No steps yet',
    });
  }

  return items.sort((left, right) => {
    const part = dayPartOrder.indexOf(left.dayPart) - dayPartOrder.indexOf(right.dayPart);
    if (part !== 0) return part;
    if (left.time && right.time) return left.time.localeCompare(right.time);
    if (left.time) return -1;
    if (right.time) return 1;
    return left.source.createdAt.localeCompare(right.source.createdAt);
  });
}

export function unfinishedTasksBefore(tasks: Task[], date: LocalDate) {
  return tasks
    .filter((task) => !task.completedAt && task.scheduledDate < date)
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));
}

export function plannedOrRecordedDateIds({
  dates = [],
  events,
  routineProgress,
  routines = [],
  tasks,
  trackers = [],
}: {
  dates?: LocalDate[];
  events: TrackedEvent[];
  routineProgress: RoutineProgress[];
  routines?: Routine[];
  tasks: Task[];
  trackers?: Tracker[];
}) {
  const marked = new Set([
    ...events.map((event) => event.forDate),
    ...tasks.map((task) => task.scheduledDate),
    ...routineProgress.map((progress) => progress.forDate),
  ]);
  for (const date of dates) {
    const hasScheduledTracker = trackers.some(
      (tracker) =>
        date >= tracker.goal.startDate && scheduleOccursOn(tracker.schedule, date),
    );
    const hasScheduledRoutine = routines.some((routine) =>
      scheduleOccursOn(routine.schedule, date),
    );
    if (hasScheduledTracker || hasScheduledRoutine) marked.add(date);
  }
  return marked;
}
