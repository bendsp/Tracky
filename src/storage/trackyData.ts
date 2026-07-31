import { accent, type AppearanceMode } from '../design/theme';
import {
  trackerIconNames,
  type ActivityBlock,
  type ActivityType,
  type DayPart,
  type DaySchedule,
  type HexColor,
  type ISOWeekday,
  type PersistedTrackyState,
  type Routine,
  type RoutineDraft,
  type RoutineProgress,
  type RoutineRunStep,
  type RoutineStep,
  type Task,
  type TaskDraft,
  type TrackedEvent,
  type Tracker,
  type TrackerDraft,
  type TrackerEntryValue,
  type TrackerField,
  type TrackerGoal,
  type TrackerIconName,
  type TrackerSummary,
  type TrackyBackupEnvelope,
  type TrackyBackupPreview,
} from '../domain/models';

export const CURRENT_DATA_SCHEMA_VERSION = 6;
export const TRACKY_BACKUP_FORMAT_VERSION = 1;

const MAX_DURATION_MINUTES = 24 * 60;
const MAX_RECURRENCE_INTERVAL = 365;

type UnknownRecord = Record<string, unknown>;

export type ParsedTrackyData = {
  state: PersistedTrackyState;
  metadata: {
    appVersion: string | null;
    exportedAt: string | null;
  };
};

export type TrackyDataErrorCode =
  | 'malformed'
  | 'future-schema'
  | 'future-backup-format';

export class TrackyDataError extends Error {
  constructor(
    readonly code: TrackyDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TrackyDataError';
  }
}

export class TrackyRollbackError extends Error {
  constructor(cause: unknown) {
    super(
      'Import failed and Tracky could not verify the rollback. Keep Tracky open and export the current data before trying again.',
      { cause },
    );
    this.name = 'TrackyRollbackError';
  }
}

export interface TrackyStringStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function malformed(message = 'This file is not a valid Tracky backup'): never {
  throw new TrackyDataError('malformed', message);
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isFiniteDate(value: unknown): value is string {
  return isString(value) && Number.isFinite(new Date(value).getTime());
}

function isLocalDate(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isLocalTime(value: unknown): value is string {
  if (!isString(value) || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isDayPart(value: unknown): value is DayPart {
  return (
    value === 'morning' ||
    value === 'afternoon' ||
    value === 'evening' ||
    value === 'anytime'
  );
}

function isDurationMinutes(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= MAX_DURATION_MINUTES)
  );
}

function localDateFromInstant(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) malformed();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isHexColor(value: unknown): value is HexColor {
  return isString(value) && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isTrackerIcon(value: unknown): value is TrackerIconName {
  return isString(value) && trackerIconNames.includes(value as TrackerIconName);
}

function appearanceFrom(candidate: UnknownRecord): AppearanceMode {
  return candidate.appearance === 'light' || candidate.appearance === 'dark'
    ? candidate.appearance
    : 'system';
}

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readField(value: unknown): TrackerField | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isString(value.type)
  ) {
    return null;
  }

  if (value.type === 'choice') {
    if (!Array.isArray(value.choices) || !value.choices.every(isString)) {
      return null;
    }
    return {
      id: value.id,
      name: value.name.trim(),
      type: 'choice',
      choices: [
        ...new Set(value.choices.map((choice) => choice.trim()).filter(Boolean)),
      ],
    };
  }

  if (value.type === 'number') {
    if (!(value.unit === null || isString(value.unit))) return null;
    return {
      id: value.id,
      name: value.name.trim(),
      type: 'number',
      unit: value.unit?.trim() || null,
    };
  }

  if (value.type === 'date') {
    return { id: value.id, name: value.name.trim(), type: 'date' };
  }

  return null;
}

function readSummary(
  value: unknown,
  fields: TrackerField[],
): TrackerSummary | null {
  if (
    !isRecord(value) ||
    (value.timeframe !== 'today' && value.timeframe !== 'thisWeek')
  ) {
    return null;
  }

  if (value.calculation === 'count' && isString(value.countLabel)) {
    return {
      calculation: 'count',
      timeframe: value.timeframe,
      countLabel: value.countLabel.trim() || 'entries',
    };
  }

  if (
    value.calculation === 'sum' &&
    isString(value.fieldId) &&
    fields.some((field) => field.id === value.fieldId && field.type === 'number')
  ) {
    return {
      calculation: 'sum',
      timeframe: value.timeframe,
      fieldId: value.fieldId,
    };
  }

  return null;
}

function readGoal(value: unknown): TrackerGoal | null {
  if (
    !isRecord(value) ||
    typeof value.targetCount !== 'number' ||
    !Number.isInteger(value.targetCount) ||
    value.targetCount < 1 ||
    value.targetCount > 99 ||
    (value.period !== 'day' &&
      value.period !== 'week' &&
      value.period !== 'month') ||
    !isLocalDate(value.startDate)
  ) {
    return null;
  }
  return {
    targetCount: value.targetCount,
    period: value.period,
    startDate: value.startDate,
  };
}

function readSchedule(value: unknown): DaySchedule | null {
  if (
    !isRecord(value) ||
    !isDayPart(value.dayPart) ||
    !isDurationMinutes(value.durationMinutes) ||
    !Array.isArray(value.exceptions) ||
    !isRecord(value.recurrence) ||
    !isLocalDate(value.startDate) ||
    !(value.time === null || isLocalTime(value.time))
  ) {
    return null;
  }

  const interval = value.recurrence.interval;
  if (
    typeof interval !== 'number' ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > MAX_RECURRENCE_INTERVAL
  ) {
    return null;
  }

  let recurrence: DaySchedule['recurrence'];
  if (value.recurrence.frequency === 'daily') {
    recurrence = { frequency: 'daily', interval };
  } else if (value.recurrence.frequency === 'weekly') {
    if (
      !Array.isArray(value.recurrence.weekdays) ||
      value.recurrence.weekdays.length === 0 ||
      !value.recurrence.weekdays.every(
        (weekday) =>
          typeof weekday === 'number' &&
          Number.isInteger(weekday) &&
          weekday >= 1 &&
          weekday <= 7,
      ) ||
      new Set(value.recurrence.weekdays).size !==
        value.recurrence.weekdays.length
    ) {
      return null;
    }
    recurrence = {
      frequency: 'weekly',
      interval,
      weekdays: [...value.recurrence.weekdays] as ISOWeekday[],
    };
  } else {
    return null;
  }

  const exceptions = value.exceptions.map((exception) => {
    if (
      !isRecord(exception) ||
      !isLocalDate(exception.date) ||
      (exception.behavior !== 'include' && exception.behavior !== 'skip')
    ) {
      return null;
    }
    return { date: exception.date, behavior: exception.behavior };
  });
  if (
    exceptions.some((exception) => !exception) ||
    new Set(exceptions.map((exception) => exception?.date)).size !==
      exceptions.length
  ) {
    return null;
  }

  return {
    dayPart: value.dayPart,
    durationMinutes: value.durationMinutes,
    exceptions: exceptions as DaySchedule['exceptions'],
    recurrence,
    startDate: value.startDate,
    time: value.time,
  };
}

function readTracker(value: unknown): Tracker | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isTrackerIcon(value.icon) ||
    !isHexColor(value.color) ||
    !Array.isArray(value.fields) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }

  const fields = value.fields.map(readField);
  if (fields.some((field) => !field)) return null;
  const validFields = fields as TrackerField[];
  if (new Set(validFields.map((field) => field.id)).size !== validFields.length) {
    return null;
  }

  const summary = readSummary(value.summary, validFields);
  const goal = readGoal(value.goal);
  const schedule = readSchedule(value.schedule);
  if (!summary || !goal || !schedule) return null;

  return {
    id: value.id,
    name: value.name.trim(),
    icon: value.icon,
    color: value.color,
    goal,
    schedule,
    fields: validFields,
    summary,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readEntryValue(
  value: unknown,
  field: TrackerField,
): TrackerEntryValue | undefined {
  if (value === null) return null;
  if (field.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }
  if (field.type === 'choice') return isString(value) ? value : undefined;
  return isLocalDate(value) ? value : undefined;
}

function readEvent(
  value: unknown,
  trackersById: Map<string, Tracker>,
): TrackedEvent | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.trackerId) ||
    !isFiniteDate(value.occurredAt) ||
    !isLocalDate(value.forDate) ||
    !isRecord(value.values) ||
    !(value.note === null || isString(value.note)) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }

  const tracker = trackersById.get(value.trackerId);
  if (!tracker) return null;
  const fieldsById = new Map(tracker.fields.map((field) => [field.id, field]));
  const values: Record<string, TrackerEntryValue> = {};

  for (const [fieldId, fieldValue] of Object.entries(value.values)) {
    const field = fieldsById.get(fieldId);
    const parsed = field
      ? readEntryValue(fieldValue, field)
      : fieldValue === null ||
          isString(fieldValue) ||
          (typeof fieldValue === 'number' && Number.isFinite(fieldValue))
        ? fieldValue
        : undefined;
    if (parsed === undefined) return null;
    values[fieldId] = parsed;
  }

  return {
    id: value.id,
    trackerId: value.trackerId,
    occurredAt: value.occurredAt,
    forDate: value.forDate,
    values,
    note: value.note?.trim() || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readTask(value: unknown): Task | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isLocalDate(value.scheduledDate) ||
    !isDayPart(value.dayPart) ||
    !(value.time === null || isLocalTime(value.time)) ||
    !isDurationMinutes(value.durationMinutes) ||
    !(value.completedAt === null || isFiniteDate(value.completedAt)) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name.trim(),
    scheduledDate: value.scheduledDate,
    dayPart: value.dayPart,
    time: value.time,
    durationMinutes: value.durationMinutes,
    completedAt: value.completedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readRoutineStep(value: unknown): RoutineStep | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isDurationMinutes(value.durationMinutes)
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name.trim(),
    durationMinutes: value.durationMinutes,
  };
}

function readRoutineRunStep(value: unknown): RoutineRunStep | null {
  const step = readRoutineStep(value);
  if (
    !step ||
    !isRecord(value) ||
    !(value.completedAt === null || isFiniteDate(value.completedAt))
  ) {
    return null;
  }
  return { ...step, completedAt: value.completedAt };
}

function readRoutine(value: unknown): Routine | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isTrackerIcon(value.icon) ||
    !isHexColor(value.color) ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0 ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }
  const schedule = readSchedule(value.schedule);
  const steps = value.steps.map(readRoutineStep);
  if (
    !schedule ||
    steps.some((step) => !step) ||
    new Set(steps.map((step) => step?.id)).size !== steps.length
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name.trim(),
    icon: value.icon,
    color: value.color,
    schedule,
    steps: steps as RoutineStep[],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readRoutineProgress(
  value: unknown,
  routinesById: Map<string, Routine>,
): RoutineProgress | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.routineId) ||
    !routinesById.has(value.routineId) ||
    !isLocalDate(value.forDate) ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0 ||
    !(value.startedAt === null || isFiniteDate(value.startedAt)) ||
    !(value.completedAt === null || isFiniteDate(value.completedAt)) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }
  const steps = value.steps.map(readRoutineRunStep);
  if (
    steps.some((step) => !step) ||
    new Set(steps.map((step) => step?.id)).size !== steps.length
  ) {
    return null;
  }
  const validSteps = steps as RoutineRunStep[];
  const hasCompletedStep = validSteps.some((step) => step.completedAt !== null);
  const allStepsComplete =
    validSteps.length > 0 &&
    validSteps.every((step) => step.completedAt !== null);
  if (
    (hasCompletedStep && value.startedAt === null) ||
    (value.completedAt !== null) !== allStepsComplete
  ) {
    return null;
  }
  return {
    id: value.id,
    routineId: value.routineId,
    forDate: value.forDate,
    steps: validSteps,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readActivityType(value: unknown): ActivityType | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isHexColor(value.color) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name.trim(),
    color: value.color,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readActivity(
  value: unknown,
  activityTypesById: Map<string, ActivityType>,
): ActivityBlock | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.activityTypeId) ||
    !activityTypesById.has(value.activityTypeId) ||
    !isNonEmptyString(value.name) ||
    !isHexColor(value.color) ||
    !isFiniteDate(value.startedAt) ||
    !(value.endedAt === null || isFiniteDate(value.endedAt)) ||
    !isFiniteDate(value.createdAt) ||
    !isFiniteDate(value.updatedAt)
  ) {
    return null;
  }

  if (
    value.endedAt !== null &&
    new Date(value.endedAt).getTime() <= new Date(value.startedAt).getTime()
  ) {
    return null;
  }

  return {
    id: value.id,
    activityTypeId: value.activityTypeId,
    name: value.name.trim(),
    color: value.color,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function hasUniqueIds(items: { id: string }[]) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function validateCurrentState(value: unknown): PersistedTrackyState {
  if (
    !isRecord(value) ||
    value.schemaVersion !== CURRENT_DATA_SCHEMA_VERSION ||
    !Array.isArray(value.activityTypes) ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.trackers) ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.routines) ||
    !Array.isArray(value.routineProgress) ||
    !isAppearanceMode(value.appearance)
  ) {
    malformed();
  }

  const activityTypes = value.activityTypes.map(readActivityType);
  if (activityTypes.some((item) => !item)) malformed();
  const validActivityTypes = activityTypes as ActivityType[];
  if (!hasUniqueIds(validActivityTypes)) malformed('Activity type IDs are invalid');
  const activityTypesById = new Map(
    validActivityTypes.map((item) => [item.id, item]),
  );

  const activities = value.activities.map((item) =>
    readActivity(item, activityTypesById),
  );
  if (activities.some((item) => !item)) malformed();
  const validActivities = activities as ActivityBlock[];
  if (!hasUniqueIds(validActivities)) malformed('Activity IDs are invalid');
  if (validActivities.filter((item) => item.endedAt === null).length > 1) {
    malformed('More than one activity is currently active');
  }
  const chronologicalActivities = [...validActivities].sort(
    (left, right) =>
      new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
  );
  for (let index = 1; index < chronologicalActivities.length; index += 1) {
    const previous = chronologicalActivities[index - 1];
    const current = chronologicalActivities[index];
    const previousEnd = previous.endedAt
      ? new Date(previous.endedAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (new Date(current.startedAt).getTime() < previousEnd) {
      malformed('Activity times overlap');
    }
  }

  const trackers = value.trackers.map(readTracker);
  if (trackers.some((item) => !item)) malformed();
  const validTrackers = trackers as Tracker[];
  if (!hasUniqueIds(validTrackers)) malformed('Tracker IDs are invalid');
  const trackersById = new Map(validTrackers.map((item) => [item.id, item]));

  const events = value.events.map((item) => readEvent(item, trackersById));
  if (events.some((item) => !item)) malformed();
  const validEvents = events as TrackedEvent[];
  if (!hasUniqueIds(validEvents)) malformed('Entry IDs are invalid');

  const tasks = value.tasks.map(readTask);
  if (tasks.some((item) => !item)) malformed();
  const validTasks = tasks as Task[];
  if (!hasUniqueIds(validTasks)) malformed('Task IDs are invalid');

  const routines = value.routines.map(readRoutine);
  if (routines.some((item) => !item)) malformed();
  const validRoutines = routines as Routine[];
  if (!hasUniqueIds(validRoutines)) malformed('Routine IDs are invalid');
  const routinesById = new Map(validRoutines.map((item) => [item.id, item]));

  const routineProgress = value.routineProgress.map((item) =>
    readRoutineProgress(item, routinesById),
  );
  if (routineProgress.some((item) => !item)) malformed();
  const validRoutineProgress = routineProgress as RoutineProgress[];
  if (!hasUniqueIds(validRoutineProgress)) {
    malformed('Routine progress IDs are invalid');
  }
  const routineDateKeys = validRoutineProgress.map(
    (item) => `${item.routineId}\u0000${item.forDate}`,
  );
  if (new Set(routineDateKeys).size !== routineDateKeys.length) {
    malformed('A routine has more than one run for the same date');
  }

  return {
    activityTypes: validActivityTypes,
    activities: validActivities,
    trackers: validTrackers,
    events: validEvents,
    tasks: validTasks,
    routines: validRoutines,
    routineProgress: validRoutineProgress,
    appearance: value.appearance,
    schemaVersion: CURRENT_DATA_SCHEMA_VERSION,
  };
}

function migrateActivities(candidate: UnknownRecord) {
  if (!Array.isArray(candidate.activities)) malformed();

  const storedTypes = Array.isArray(candidate.activityTypes)
    ? candidate.activityTypes.map(readActivityType)
    : [];
  if (storedTypes.some((item) => !item)) malformed();
  const activityTypes = [...(storedTypes as ActivityType[])];
  const activities: ActivityBlock[] = [];

  for (const item of candidate.activities) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.name) ||
      !isFiniteDate(item.startedAt) ||
      !(item.endedAt === null || isFiniteDate(item.endedAt)) ||
      !isFiniteDate(item.createdAt) ||
      !isFiniteDate(item.updatedAt)
    ) {
      malformed();
    }

    const storedTypeId = isString(item.activityTypeId)
      ? item.activityTypeId
      : null;
    const itemName = item.name;
    let activityType =
      activityTypes.find((type) => type.id === storedTypeId) ??
      activityTypes.find(
        (type) =>
          type.name.toLocaleLowerCase() === itemName.toLocaleLowerCase(),
      );

    if (!activityType) {
      activityType = {
        id: `activity_type_migrated_${item.id}`,
        name: itemName.trim(),
        color: isHexColor(item.color) ? item.color : accent.primary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
      activityTypes.push(activityType);
    }

    activities.push({
      id: item.id,
      activityTypeId: activityType.id,
      name: activityType.name,
      color: activityType.color,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  return { activities, activityTypes };
}

function migrateVersionOneToTwo(candidate: UnknownRecord): UnknownRecord {
  return { ...candidate, schemaVersion: 2 };
}

function migrateVersionTwoToThree(candidate: UnknownRecord): UnknownRecord {
  if (!Array.isArray(candidate.trackers) || !Array.isArray(candidate.events)) {
    malformed();
  }

  const activityData = migrateActivities(candidate);
  const legacyEvents = candidate.events.filter(isRecord);
  if (legacyEvents.length !== candidate.events.length) malformed();

  const trackers: Omit<Tracker, 'goal' | 'schedule'>[] = [];
  const numberFields = new Map<string, string>();

  for (const raw of candidate.trackers) {
    if (
      !isRecord(raw) ||
      !isNonEmptyString(raw.id) ||
      !isNonEmptyString(raw.name) ||
      !(raw.unit === null || isString(raw.unit)) ||
      !isFiniteDate(raw.createdAt) ||
      !isFiniteDate(raw.updatedAt)
    ) {
      malformed();
    }

    const hasNumericEvent = legacyEvents.some(
      (event) =>
        event.trackerId === raw.id &&
        typeof event.numericValue === 'number' &&
        Number.isFinite(event.numericValue),
    );
    const fieldId = `field_migrated_${raw.id}`;
    const fields: TrackerField[] =
      raw.unit || hasNumericEvent
        ? [
            {
              id: fieldId,
              name: 'Amount',
              type: 'number',
              unit: raw.unit?.trim() || null,
            },
          ]
        : [];
    if (fields.length) numberFields.set(raw.id, fieldId);

    trackers.push({
      id: raw.id,
      name: raw.name.trim(),
      icon: 'activity',
      color: accent.primary,
      fields,
      summary: fields.length
        ? { calculation: 'sum', timeframe: 'today', fieldId }
        : { calculation: 'count', timeframe: 'today', countLabel: 'entries' },
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  const trackerIds = new Set(trackers.map((tracker) => tracker.id));
  const events: Omit<TrackedEvent, 'forDate'>[] = [];

  for (const raw of legacyEvents) {
    if (
      !isNonEmptyString(raw.id) ||
      !isNonEmptyString(raw.trackerId) ||
      !trackerIds.has(raw.trackerId) ||
      !isFiniteDate(raw.occurredAt) ||
      !(raw.numericValue === null ||
        (typeof raw.numericValue === 'number' &&
          Number.isFinite(raw.numericValue))) ||
      !(raw.note === null || isString(raw.note)) ||
      !isFiniteDate(raw.createdAt) ||
      !isFiniteDate(raw.updatedAt)
    ) {
      malformed();
    }

    const fieldId = numberFields.get(raw.trackerId);
    events.push({
      id: raw.id,
      trackerId: raw.trackerId,
      occurredAt: raw.occurredAt,
      values:
        fieldId && typeof raw.numericValue === 'number'
          ? { [fieldId]: raw.numericValue }
          : {},
      note: raw.note?.trim() || null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  return {
    ...activityData,
    trackers,
    events,
    appearance: appearanceFrom(candidate),
    schemaVersion: 3,
  };
}

function migrateVersionThreeToFour(candidate: UnknownRecord): UnknownRecord {
  return { ...candidate, schemaVersion: 4 };
}

function migrateVersionFourToFive(candidate: UnknownRecord): UnknownRecord {
  if (!Array.isArray(candidate.trackers)) malformed();
  const trackers = candidate.trackers.map((tracker) => {
    if (
      !isRecord(tracker) ||
      !isFiniteDate(tracker.createdAt)
    ) {
      malformed();
    }
    return {
      ...tracker,
      goal: {
        targetCount: 1,
        period: 'day',
        startDate: tracker.createdAt.slice(0, 10),
      },
    };
  });
  return { ...candidate, trackers, schemaVersion: 5 };
}

function migrateVersionFiveToSix(candidate: UnknownRecord): UnknownRecord {
  if (!Array.isArray(candidate.trackers) || !Array.isArray(candidate.events)) {
    malformed();
  }

  const trackers = candidate.trackers.map((tracker) => {
    if (
      !isRecord(tracker) ||
      !isRecord(tracker.goal) ||
      !isLocalDate(tracker.goal.startDate)
    ) {
      malformed();
    }
    return {
      ...tracker,
      schedule: {
        dayPart: 'anytime',
        durationMinutes: null,
        exceptions: [],
        recurrence: { frequency: 'daily', interval: 1 },
        startDate: tracker.goal.startDate,
        time: null,
      },
    };
  });

  const events = candidate.events.map((event) => {
    if (!isRecord(event) || !isFiniteDate(event.occurredAt)) malformed();
    return {
      ...event,
      // v5 stored only a UTC instant, not the device's original calendar
      // date. Preserve the day the pre-v6 UI would show in the timezone where
      // this migration runs; after v6 the explicit value is stable on travel.
      forDate: localDateFromInstant(event.occurredAt),
    };
  });

  return {
    ...candidate,
    trackers,
    events,
    tasks: [],
    routines: [],
    routineProgress: [],
    schemaVersion: 6,
  };
}

const migrations: Record<
  number,
  (candidate: UnknownRecord) => UnknownRecord
> = {
  1: migrateVersionOneToTwo,
  2: migrateVersionTwoToThree,
  3: migrateVersionThreeToFour,
  4: migrateVersionFourToFive,
  5: migrateVersionFiveToSix,
};

function readSchemaVersion(candidate: UnknownRecord) {
  if (candidate.schemaVersion === undefined) return 1;
  if (
    typeof candidate.schemaVersion !== 'number' ||
    !Number.isInteger(candidate.schemaVersion) ||
    candidate.schemaVersion < 1
  ) {
    malformed('The Tracky data schema version is invalid');
  }
  return candidate.schemaVersion;
}

function unwrapInput(input: unknown) {
  let candidate: unknown = input;
  if (isString(candidate)) {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      malformed();
    }
  }
  if (!isRecord(candidate)) malformed();

  if (
    'format' in candidate ||
    'formatVersion' in candidate ||
    'payload' in candidate
  ) {
    if (candidate.format !== 'tracky-backup') malformed();
    if (
      typeof candidate.formatVersion !== 'number' ||
      !Number.isInteger(candidate.formatVersion)
    ) {
      malformed('The Tracky backup format version is invalid');
    }
    if (candidate.formatVersion > TRACKY_BACKUP_FORMAT_VERSION) {
      throw new TrackyDataError(
        'future-backup-format',
        'This backup needs a newer version of Tracky. Update Tracky and try again.',
      );
    }
    if (candidate.formatVersion !== TRACKY_BACKUP_FORMAT_VERSION) malformed();
    if (
      typeof candidate.dataSchemaVersion !== 'number' ||
      !Number.isInteger(candidate.dataSchemaVersion) ||
      candidate.dataSchemaVersion < 1 ||
      !isNonEmptyString(candidate.appVersion) ||
      !isFiniteDate(candidate.exportedAt) ||
      !isRecord(candidate.payload) ||
      candidate.payload.schemaVersion !== candidate.dataSchemaVersion
    ) {
      malformed();
    }

    return {
      candidate: {
        ...candidate.payload,
        schemaVersion: candidate.dataSchemaVersion,
      },
      metadata: {
        appVersion: candidate.appVersion,
        exportedAt: candidate.exportedAt,
      },
    };
  }

  return {
    candidate,
    metadata: {
      appVersion: null,
      exportedAt: isFiniteDate(candidate.exportedAt)
        ? candidate.exportedAt
        : null,
    },
  };
}

export function parseAndMigrateTrackyData(
  unknownInput: unknown,
): ParsedTrackyData {
  const unwrapped = unwrapInput(unknownInput);
  let candidate = unwrapped.candidate;
  let schemaVersion = readSchemaVersion(candidate);

  if (schemaVersion > CURRENT_DATA_SCHEMA_VERSION) {
    throw new TrackyDataError(
      'future-schema',
      'This backup was created by a newer version of Tracky. Update Tracky and try again.',
    );
  }

  while (schemaVersion < CURRENT_DATA_SCHEMA_VERSION) {
    const migrate = migrations[schemaVersion];
    if (!migrate) {
      malformed(`Tracky cannot migrate data schema ${schemaVersion}`);
    }
    candidate = migrate(candidate);
    schemaVersion = readSchemaVersion(candidate);
  }

  return {
    state: validateCurrentState(candidate),
    metadata: unwrapped.metadata,
  };
}

export function trackyHydrationErrorMessage(error: unknown) {
  if (
    error instanceof TrackyDataError &&
    (error.code === 'future-schema' ||
      error.code === 'future-backup-format')
  ) {
    return error.message;
  }
  return 'Your stored data has not been changed. Try reading it again before continuing.';
}

export function sanitizeTrackerDraft(draft: TrackerDraft): TrackerDraft | null {
  const name = draft.name.trim();
  if (!name || !isTrackerIcon(draft.icon) || !isHexColor(draft.color)) {
    return null;
  }
  const fields = draft.fields.map(readField);
  if (fields.some((field) => !field)) return null;
  const validFields = fields as TrackerField[];
  if (new Set(validFields.map((field) => field.id)).size !== validFields.length) {
    return null;
  }
  const summary = readSummary(draft.summary, validFields);
  const goal = readGoal(draft.goal);
  const schedule = readSchedule(draft.schedule);
  if (!summary || !goal || !schedule) return null;
  return {
    name,
    icon: draft.icon,
    color: draft.color,
    goal,
    schedule,
    fields: validFields,
    summary,
  };
}

export function sanitizeTaskDraft(draft: TaskDraft): TaskDraft | null {
  const name = draft.name.trim();
  if (
    !name ||
    !isLocalDate(draft.scheduledDate) ||
    !isDayPart(draft.dayPart) ||
    !(draft.time === null || isLocalTime(draft.time)) ||
    !isDurationMinutes(draft.durationMinutes)
  ) {
    return null;
  }
  return {
    name,
    scheduledDate: draft.scheduledDate,
    dayPart: draft.dayPart,
    time: draft.time,
    durationMinutes: draft.durationMinutes,
  };
}

export function sanitizeRoutineDraft(draft: RoutineDraft): RoutineDraft | null {
  const name = draft.name.trim();
  const schedule = readSchedule(draft.schedule);
  const steps = draft.steps.map(readRoutineStep);
  if (
    !name ||
    !isTrackerIcon(draft.icon) ||
    !isHexColor(draft.color) ||
    !schedule ||
    draft.steps.length === 0 ||
    steps.some((step) => !step) ||
    new Set(steps.map((step) => step?.id)).size !== steps.length
  ) {
    return null;
  }
  return {
    name,
    icon: draft.icon,
    color: draft.color,
    schedule,
    steps: steps as RoutineStep[],
  };
}

export function createTrackyBackup(
  state: PersistedTrackyState,
  appVersion: string,
  exportedAt = new Date().toISOString(),
): TrackyBackupEnvelope {
  const payload = parseAndMigrateTrackyData(state).state;
  return {
    format: 'tracky-backup',
    formatVersion: TRACKY_BACKUP_FORMAT_VERSION,
    dataSchemaVersion: CURRENT_DATA_SCHEMA_VERSION,
    appVersion,
    exportedAt,
    payload,
  };
}

export function createTrackyBackupPreview(
  parsed: ParsedTrackyData,
): TrackyBackupPreview {
  const dates = [
    ...parsed.state.activities.flatMap((activity) => [
      activity.startedAt,
      ...(activity.endedAt ? [activity.endedAt] : []),
    ]),
    ...parsed.state.events.map((event) => `${event.forDate}T12:00:00`),
    ...parsed.state.tasks.map((task) => `${task.scheduledDate}T12:00:00`),
    ...parsed.state.routineProgress.map(
      (progress) => `${progress.forDate}T12:00:00`,
    ),
  ]
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => left - right);

  return {
    appVersion: parsed.metadata.appVersion,
    exportedAt: parsed.metadata.exportedAt,
    trackerCount: parsed.state.trackers.length,
    entryCount: parsed.state.events.length,
    activityCount: parsed.state.activities.length,
    dateRange:
      dates.length > 0
        ? {
            start: new Date(dates[0]).toISOString(),
            end: new Date(dates[dates.length - 1]).toISOString(),
          }
        : null,
  };
}

function statesMatch(
  left: PersistedTrackyState,
  right: PersistedTrackyState,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function replaceStoredTrackyData({
  fallbackCurrentState,
  key,
  replacement,
  storage,
}: {
  fallbackCurrentState: PersistedTrackyState;
  key: string;
  replacement: unknown;
  storage: TrackyStringStorage;
}) {
  const nextState = parseAndMigrateTrackyData(replacement).state;
  const storedCurrent = await storage.getItem(key);
  const rollbackState = parseAndMigrateTrackyData(
    storedCurrent ?? fallbackCurrentState,
  ).state;
  const rollbackPayload = JSON.stringify(rollbackState);
  const nextPayload = JSON.stringify(nextState);
  let attemptedWrite = false;

  try {
    attemptedWrite = true;
    await storage.setItem(key, nextPayload);
    const readback = await storage.getItem(key);
    if (!readback) throw new Error('Imported data was not persisted');
    const verified = parseAndMigrateTrackyData(readback).state;
    if (!statesMatch(verified, nextState)) {
      throw new Error('Imported data did not match after persistence');
    }
    return verified;
  } catch (error) {
    if (attemptedWrite) {
      try {
        await storage.setItem(key, rollbackPayload);
        const rollbackReadback = await storage.getItem(key);
        if (!rollbackReadback) {
          throw new Error('Restored data was not persisted');
        }
        const verifiedRollback =
          parseAndMigrateTrackyData(rollbackReadback).state;
        if (!statesMatch(verifiedRollback, rollbackState)) {
          throw new Error('Restored data did not match after persistence');
        }
      } catch (rollbackError) {
        throw new TrackyRollbackError(rollbackError);
      }
    }
    throw error;
  }
}
