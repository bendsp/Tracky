import type {
  DaySchedule,
  ISOWeekday,
  LocalDate,
  Routine,
  RoutineProgress,
  RoutineRunStep,
  ScheduleRecurrence,
  Task,
  TrackedEvent,
  Tracker,
} from './models';
import { localDateKey, trackerGoalStatus } from './tracking';

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

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function localDaysBetween(from: LocalDate, to: LocalDate) {
  return utcDayNumber(to) - utcDayNumber(from);
}

export function localTimeOf(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export function defaultDaySchedule(startDate = localDateKey(new Date())): DaySchedule {
  return {
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
  return [recurrence, schedule.time].filter(Boolean).join(' · ');
}

export type DayPlanItem =
  | {
      id: string;
      kind: 'tracker';
      source: Tracker;
      time: string | null;
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
      time: string | null;
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
      /** The run's steps, already resolved from its snapshot or the template. */
      steps: RoutineRunStep[];
      time: string | null;
      skipped: boolean;
      complete: boolean;
      count: number;
      target: number;
      detail: string;
    };

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
      time: tracker.schedule.time,
      skipped,
      complete: status.complete,
      count: status.count,
      target: status.targetCount,
      detail: tracker.schedule.time || trackerPlanDetail(tracker, status),
    });
  }

  for (const task of tasks) {
    if (task.scheduledDate !== date) continue;
    items.push({
      id: `task:${task.id}`,
      kind: 'task',
      source: task,
      time: task.time,
      skipped: false,
      complete: task.completedAt !== null,
      count: task.completedAt ? 1 : 0,
      target: 1,
      detail: task.time ?? '',
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
      steps: runSteps,
      time: routine.schedule.time,
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
    if (left.time && right.time) return left.time.localeCompare(right.time);
    if (left.time) return -1;
    if (right.time) return 1;
    return left.source.createdAt.localeCompare(right.source.createdAt);
  });
}

/** Skipped items leave the day rather than sitting in it greyed out. */
export function partitionDayPlan(items: DayPlanItem[]) {
  const active: DayPlanItem[] = [];
  const skipped: DayPlanItem[] = [];
  for (const item of items) {
    (item.skipped ? skipped : active).push(item);
  }
  return { active, skipped };
}

/**
 * How far back the "unfinished from earlier" row looks. Without a floor the
 * count grows for as long as the app is installed, which turns one calm row
 * into a running tally of everything never done — the exact pile collapsing it
 * into a single row was meant to avoid.
 */
export const EARLIER_TASK_HORIZON_DAYS = 14;

export function unfinishedTasksBefore(
  tasks: Task[],
  date: LocalDate,
  horizonDays = EARLIER_TASK_HORIZON_DAYS,
) {
  const floor = addLocalDays(date, -Math.max(0, horizonDays));
  return tasks
    .filter(
      (task) =>
        !task.completedAt &&
        task.scheduledDate < date &&
        task.scheduledDate >= floor,
    )
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
