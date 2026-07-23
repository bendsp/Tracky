import { accent, type AppearanceMode } from '../design/theme';
import {
  trackerIconNames,
  type ActivityBlock,
  type ActivityType,
  type HexColor,
  type PersistedTrackyState,
  type TrackedEvent,
  type Tracker,
  type TrackerDraft,
  type TrackerEntryValue,
  type TrackerField,
  type TrackerIconName,
  type TrackerSummary,
  type TrackyBackupEnvelope,
  type TrackyBackupPreview,
} from '../domain/models';

export const CURRENT_DATA_SCHEMA_VERSION = 3;
export const TRACKY_BACKUP_FORMAT_VERSION = 1;

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
  if (!summary) return null;

  return {
    id: value.id,
    name: value.name.trim(),
    icon: value.icon,
    color: value.color,
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
  return isFiniteDate(value) ? value : undefined;
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
    values,
    note: value.note?.trim() || null,
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

  const trackers = value.trackers.map(readTracker);
  if (trackers.some((item) => !item)) malformed();
  const validTrackers = trackers as Tracker[];
  if (!hasUniqueIds(validTrackers)) malformed('Tracker IDs are invalid');
  const trackersById = new Map(validTrackers.map((item) => [item.id, item]));

  const events = value.events.map((item) => readEvent(item, trackersById));
  if (events.some((item) => !item)) malformed();
  const validEvents = events as TrackedEvent[];
  if (!hasUniqueIds(validEvents)) malformed('Entry IDs are invalid');

  return {
    activityTypes: validActivityTypes,
    activities: validActivities,
    trackers: validTrackers,
    events: validEvents,
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

  const trackers: Tracker[] = [];
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
  const events: TrackedEvent[] = [];

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
    schemaVersion: CURRENT_DATA_SCHEMA_VERSION,
  };
}

const migrations: Record<
  number,
  (candidate: UnknownRecord) => UnknownRecord
> = {
  1: migrateVersionOneToTwo,
  2: migrateVersionTwoToThree,
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
  if (!summary) return null;
  return {
    name,
    icon: draft.icon,
    color: draft.color,
    fields: validFields,
    summary,
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
    ...parsed.state.events.map((event) => event.occurredAt),
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
