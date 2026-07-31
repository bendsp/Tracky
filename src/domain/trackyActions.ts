import type {
  DayPart,
  DaySchedule,
  EntityId,
  HexColor,
  ISODateTime,
  ISOWeekday,
  LocalDate,
  PersistedTrackyState,
  Routine,
  RoutineDraft,
  Task,
  TaskDraft,
  TrackerIconName,
} from './models';
import { trackerIconNames } from './models';
import {
  isLocalDate,
  isLocalTime,
  localDateAtEnd,
  scheduleOccursOn,
} from './planning';
import { trackerGoalStatus } from './tracking';

export type ActionTime = {
  now: ISODateTime;
};

export type ActionIdentity = ActionTime & {
  id: EntityId;
};

const dayParts: DayPart[] = [
  'morning',
  'afternoon',
  'evening',
  'anytime',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isISODateTime(value: unknown): value is ISODateTime {
  return (
    typeof value === 'string' && Number.isFinite(new Date(value).getTime())
  );
}

function isDuration(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 1_440)
  );
}

function isDayPart(value: unknown): value is DayPart {
  return dayParts.includes(value as DayPart);
}

function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isTrackerIcon(value: unknown): value is TrackerIconName {
  return (
    typeof value === 'string' &&
    trackerIconNames.includes(value as TrackerIconName)
  );
}

function cloneSchedule(schedule: DaySchedule): DaySchedule {
  return {
    ...schedule,
    exceptions: schedule.exceptions.map((exception) => ({ ...exception })),
    recurrence:
      schedule.recurrence.frequency === 'weekly'
        ? {
            ...schedule.recurrence,
            weekdays: [...schedule.recurrence.weekdays],
          }
        : { ...schedule.recurrence },
  };
}

function cleanSchedule(value: unknown): DaySchedule | null {
  if (
    !isRecord(value) ||
    !isLocalDate(value.startDate) ||
    !isDayPart(value.dayPart) ||
    !(value.time === null || isLocalTime(value.time)) ||
    !isDuration(value.durationMinutes) ||
    !Array.isArray(value.exceptions) ||
    !isRecord(value.recurrence)
  ) {
    return null;
  }

  const recurrence = value.recurrence;
  if (
    !Number.isInteger(recurrence.interval) ||
    typeof recurrence.interval !== 'number' ||
    recurrence.interval < 1 ||
    recurrence.interval > 365
  ) {
    return null;
  }

  let cleanRecurrence: DaySchedule['recurrence'];
  if (recurrence.frequency === 'daily') {
    cleanRecurrence = {
      frequency: 'daily',
      interval: recurrence.interval,
    };
  } else if (
    recurrence.frequency === 'weekly' &&
    Array.isArray(recurrence.weekdays) &&
    recurrence.weekdays.length > 0 &&
    recurrence.weekdays.every(
      (weekday) =>
        typeof weekday === 'number' &&
        Number.isInteger(weekday) &&
        weekday >= 1 &&
        weekday <= 7,
    ) &&
    new Set(recurrence.weekdays).size === recurrence.weekdays.length
  ) {
    cleanRecurrence = {
      frequency: 'weekly',
      interval: recurrence.interval,
      weekdays: [...recurrence.weekdays] as ISOWeekday[],
    };
  } else {
    return null;
  }

  const cleanExceptions: DaySchedule['exceptions'] = [];
  const dates = new Set<string>();
  for (const exception of value.exceptions) {
    if (
      !isRecord(exception) ||
      !isLocalDate(exception.date) ||
      (exception.behavior !== 'include' && exception.behavior !== 'skip') ||
      dates.has(exception.date)
    ) {
      return null;
    }
    dates.add(exception.date);
    cleanExceptions.push({
      date: exception.date,
      behavior: exception.behavior,
    });
  }

  return {
    startDate: value.startDate,
    dayPart: value.dayPart,
    time: value.time,
    durationMinutes: value.durationMinutes,
    recurrence: cleanRecurrence,
    exceptions: cleanExceptions,
  };
}

function cleanTaskDraft(draft: TaskDraft): TaskDraft | null {
  if (
    !isNonEmptyString(draft.name) ||
    !isLocalDate(draft.scheduledDate) ||
    !isDayPart(draft.dayPart) ||
    !(draft.time === null || isLocalTime(draft.time)) ||
    !isDuration(draft.durationMinutes)
  ) {
    return null;
  }

  return {
    name: draft.name.trim(),
    scheduledDate: draft.scheduledDate,
    dayPart: draft.dayPart,
    time: draft.time,
    durationMinutes: draft.durationMinutes,
  };
}

function cleanRoutineDraft(draft: RoutineDraft): RoutineDraft | null {
  const schedule = cleanSchedule(draft.schedule);
  if (
    !isNonEmptyString(draft.name) ||
    !isTrackerIcon(draft.icon) ||
    !isHexColor(draft.color) ||
    !schedule ||
    !Array.isArray(draft.steps) ||
    draft.steps.length === 0
  ) {
    return null;
  }

  const stepIds = new Set<string>();
  const steps: Routine['steps'] = [];
  for (const step of draft.steps) {
    if (
      !isRecord(step) ||
      !isNonEmptyString(step.id) ||
      !isNonEmptyString(step.name) ||
      !isDuration(step.durationMinutes) ||
      stepIds.has(step.id)
    ) {
      return null;
    }
    stepIds.add(step.id);
    steps.push({
      id: step.id,
      name: step.name.trim(),
      durationMinutes: step.durationMinutes,
    });
  }

  return {
    name: draft.name.trim(),
    icon: draft.icon,
    color: draft.color,
    schedule,
    steps,
  };
}

function validIdentity(
  state: PersistedTrackyState,
  identity: ActionIdentity,
  collection: { id: string }[],
) {
  return (
    isISODateTime(identity.now) &&
    isNonEmptyString(identity.id) &&
    !collection.some((item) => item.id === identity.id) &&
    state.schemaVersion === 6
  );
}

export function createTask(
  state: PersistedTrackyState,
  draft: TaskDraft,
  identity: ActionIdentity,
): PersistedTrackyState {
  const clean = cleanTaskDraft(draft);
  if (!clean || !validIdentity(state, identity, state.tasks)) return state;

  const task: Task = {
    id: identity.id,
    ...clean,
    completedAt: null,
    createdAt: identity.now,
    updatedAt: identity.now,
  };
  return { ...state, tasks: [...state.tasks, task] };
}

export function updateTask(
  state: PersistedTrackyState,
  taskId: EntityId,
  draft: TaskDraft,
  time: ActionTime,
): PersistedTrackyState {
  const clean = cleanTaskDraft(draft);
  if (
    !clean ||
    !isISODateTime(time.now) ||
    !state.tasks.some((task) => task.id === taskId)
  ) {
    return state;
  }

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? { ...task, ...clean, updatedAt: time.now }
        : task,
    ),
  };
}

export function deleteTask(
  state: PersistedTrackyState,
  taskId: EntityId,
): PersistedTrackyState {
  if (!state.tasks.some((task) => task.id === taskId)) return state;
  return {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== taskId),
  };
}

export function toggleTaskCompletion(
  state: PersistedTrackyState,
  taskId: EntityId,
  time: ActionTime,
): PersistedTrackyState {
  if (
    !isISODateTime(time.now) ||
    !state.tasks.some((task) => task.id === taskId)
  ) {
    return state;
  }
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completedAt: task.completedAt ? null : time.now,
            updatedAt: time.now,
          }
        : task,
    ),
  };
}

export function toggleTrackerCheckInForDate(
  state: PersistedTrackyState,
  trackerId: EntityId,
  forDate: LocalDate,
  identity: ActionIdentity,
): PersistedTrackyState {
  const tracker = state.trackers.find((item) => item.id === trackerId);
  if (
    !tracker ||
    !isLocalDate(forDate) ||
    forDate < tracker.goal.startDate ||
    !isISODateTime(identity.now) ||
    !isNonEmptyString(identity.id)
  ) {
    return state;
  }

  const eventsOnDate = state.events
    .filter(
      (event) => event.trackerId === trackerId && event.forDate === forDate,
    )
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    );
  const status = trackerGoalStatus(
    tracker,
    state.events,
    localDateAtEnd(forDate),
  );
  const removable = status.complete ? eventsOnDate[0] : undefined;

  if (removable) {
    return {
      ...state,
      events: state.events.filter((event) => event.id !== removable.id),
    };
  }
  if (state.events.some((event) => event.id === identity.id)) return state;

  return {
    ...state,
    events: [
      ...state.events,
      {
        id: identity.id,
        trackerId,
        occurredAt: identity.now,
        forDate,
        values: {},
        note: null,
        createdAt: identity.now,
        updatedAt: identity.now,
      },
    ],
  };
}

export function createRoutine(
  state: PersistedTrackyState,
  draft: RoutineDraft,
  identity: ActionIdentity,
): PersistedTrackyState {
  const clean = cleanRoutineDraft(draft);
  if (!clean || !validIdentity(state, identity, state.routines)) return state;

  const routine: Routine = {
    id: identity.id,
    ...clean,
    schedule: cloneSchedule(clean.schedule),
    steps: clean.steps.map((step) => ({ ...step })),
    createdAt: identity.now,
    updatedAt: identity.now,
  };
  return { ...state, routines: [...state.routines, routine] };
}

export function updateRoutine(
  state: PersistedTrackyState,
  routineId: EntityId,
  draft: RoutineDraft,
  time: ActionTime,
): PersistedTrackyState {
  const clean = cleanRoutineDraft(draft);
  if (
    !clean ||
    !isISODateTime(time.now) ||
    !state.routines.some((routine) => routine.id === routineId)
  ) {
    return state;
  }

  return {
    ...state,
    routines: state.routines.map((routine) =>
      routine.id === routineId
        ? {
            ...routine,
            ...clean,
            schedule: cloneSchedule(clean.schedule),
            steps: clean.steps.map((step) => ({ ...step })),
            updatedAt: time.now,
          }
        : routine,
    ),
  };
}

export function deleteRoutine(
  state: PersistedTrackyState,
  routineId: EntityId,
): PersistedTrackyState {
  if (!state.routines.some((routine) => routine.id === routineId)) return state;
  return {
    ...state,
    routines: state.routines.filter((routine) => routine.id !== routineId),
    routineProgress: state.routineProgress.filter(
      (progress) => progress.routineId !== routineId,
    ),
  };
}

export function toggleRoutineStepCompletion(
  state: PersistedTrackyState,
  routineId: EntityId,
  forDate: LocalDate,
  stepId: EntityId,
  identity: ActionIdentity,
): PersistedTrackyState {
  const routine = state.routines.find((item) => item.id === routineId);
  const existing = state.routineProgress.find(
    (progress) =>
      progress.routineId === routineId && progress.forDate === forDate,
  );
  if (
    !routine ||
    !isLocalDate(forDate) ||
    !isISODateTime(identity.now) ||
    !isNonEmptyString(identity.id) ||
    (!scheduleOccursOn(routine.schedule, forDate) && !existing)
  ) {
    return state;
  }
  const sourceSteps = existing?.steps ?? routine.steps;
  if (!sourceSteps.some((step) => step.id === stepId)) return state;

  if (!existing) {
    if (
      state.routineProgress.some((progress) => progress.id === identity.id)
    ) {
      return state;
    }
    const steps = routine.steps.map((step) => ({
      ...step,
      completedAt: step.id === stepId ? identity.now : null,
    }));
    const complete = steps.length > 0 && steps.every((step) => step.completedAt);
    return {
      ...state,
      routineProgress: [
        ...state.routineProgress,
        {
          id: identity.id,
          routineId,
          forDate,
          steps,
          startedAt: identity.now,
          completedAt: complete ? identity.now : null,
          createdAt: identity.now,
          updatedAt: identity.now,
        },
      ],
    };
  }

  const steps = existing.steps.map((step) =>
    step.id === stepId
      ? { ...step, completedAt: step.completedAt ? null : identity.now }
      : step,
  );
  const complete = steps.length > 0 && steps.every((step) => step.completedAt);
  return {
    ...state,
    routineProgress: state.routineProgress.map((progress) =>
      progress.id === existing.id
        ? {
            ...progress,
            steps,
            completedAt: complete ? identity.now : null,
            updatedAt: identity.now,
          }
        : progress,
    ),
  };
}

function setScheduleDateBehavior(
  schedule: DaySchedule,
  date: LocalDate,
  behavior: 'skip' | null,
) {
  const existing = schedule.exceptions.find(
    (exception) => exception.date === date,
  );
  if (
    (behavior === 'skip' && existing?.behavior === 'skip') ||
    (behavior === null && !existing)
  ) {
    return null;
  }

  const exceptions = schedule.exceptions.filter(
    (exception) => exception.date !== date,
  );
  if (behavior) exceptions.push({ date, behavior });
  return { ...cloneSchedule(schedule), exceptions };
}

function changeTrackerScheduleDate(
  state: PersistedTrackyState,
  trackerId: EntityId,
  date: LocalDate,
  behavior: 'skip' | null,
  time: ActionTime,
) {
  if (!isLocalDate(date) || !isISODateTime(time.now)) return state;
  const tracker = state.trackers.find((item) => item.id === trackerId);
  if (!tracker) return state;
  const schedule = setScheduleDateBehavior(tracker.schedule, date, behavior);
  if (!schedule) return state;
  return {
    ...state,
    trackers: state.trackers.map((item) =>
      item.id === trackerId
        ? { ...item, schedule, updatedAt: time.now }
        : item,
    ),
  };
}

function changeRoutineScheduleDate(
  state: PersistedTrackyState,
  routineId: EntityId,
  date: LocalDate,
  behavior: 'skip' | null,
  time: ActionTime,
) {
  if (!isLocalDate(date) || !isISODateTime(time.now)) return state;
  const routine = state.routines.find((item) => item.id === routineId);
  if (!routine) return state;
  const schedule = setScheduleDateBehavior(routine.schedule, date, behavior);
  if (!schedule) return state;
  return {
    ...state,
    routines: state.routines.map((item) =>
      item.id === routineId
        ? { ...item, schedule, updatedAt: time.now }
        : item,
    ),
  };
}

export function skipTrackerScheduleDate(
  state: PersistedTrackyState,
  trackerId: EntityId,
  date: LocalDate,
  time: ActionTime,
): PersistedTrackyState {
  return changeTrackerScheduleDate(state, trackerId, date, 'skip', time);
}

export function restoreTrackerScheduleDate(
  state: PersistedTrackyState,
  trackerId: EntityId,
  date: LocalDate,
  time: ActionTime,
): PersistedTrackyState {
  return changeTrackerScheduleDate(state, trackerId, date, null, time);
}

export function skipRoutineScheduleDate(
  state: PersistedTrackyState,
  routineId: EntityId,
  date: LocalDate,
  time: ActionTime,
): PersistedTrackyState {
  return changeRoutineScheduleDate(state, routineId, date, 'skip', time);
}

export function restoreRoutineScheduleDate(
  state: PersistedTrackyState,
  routineId: EntityId,
  date: LocalDate,
  time: ActionTime,
): PersistedTrackyState {
  return changeRoutineScheduleDate(state, routineId, date, null, time);
}
