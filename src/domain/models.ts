import type { AppearanceMode } from '../design/theme';

export type EntityId = string;
export type ISODateTime = string;
export type HexColor = `#${string}`;

export type EntityTimestamps = {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ActivityType = EntityTimestamps & {
  id: EntityId;
  name: string;
  color: HexColor;
};

export type ActivityBlock = EntityTimestamps & {
  id: EntityId;
  activityTypeId: EntityId;
  name: string;
  color: HexColor;
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
};

export const trackerIconNames = [
  'droplet',
  'meditation',
  'coffee',
  'activity',
  'heart',
  'book',
  'leaf',
  'star',
] as const;

export type TrackerIconName = (typeof trackerIconNames)[number];
export type TrackerFieldType = 'choice' | 'number' | 'date';

export type TrackerChoiceField = {
  id: EntityId;
  name: string;
  type: 'choice';
  choices: string[];
};

export type TrackerNumberField = {
  id: EntityId;
  name: string;
  type: 'number';
  unit: string | null;
};

export type TrackerDateField = {
  id: EntityId;
  name: string;
  type: 'date';
};

export type TrackerField =
  | TrackerChoiceField
  | TrackerNumberField
  | TrackerDateField;

export type TrackerSummaryTimeframe = 'today' | 'thisWeek';

export type TrackerSummary =
  | {
      calculation: 'count';
      timeframe: TrackerSummaryTimeframe;
      countLabel: string;
    }
  | {
      calculation: 'sum';
      timeframe: TrackerSummaryTimeframe;
      fieldId: EntityId;
    };

export type Tracker = EntityTimestamps & {
  id: EntityId;
  name: string;
  icon: TrackerIconName;
  color: HexColor;
  fields: TrackerField[];
  summary: TrackerSummary;
};

export type TrackerEntryValue = string | number | null;

export type TrackedEvent = EntityTimestamps & {
  id: EntityId;
  trackerId: EntityId;
  occurredAt: ISODateTime;
  values: Record<EntityId, TrackerEntryValue>;
  note: string | null;
};

export type TrackyData = {
  activityTypes: ActivityType[];
  activities: ActivityBlock[];
  trackers: Tracker[];
  events: TrackedEvent[];
};

export type PersistedTrackyState = TrackyData & {
  appearance: AppearanceMode;
  schemaVersion: 3;
};

export type TrackyBackupEnvelope = {
  format: 'tracky-backup';
  formatVersion: 1;
  dataSchemaVersion: 3;
  appVersion: string;
  exportedAt: ISODateTime;
  payload: PersistedTrackyState;
};

export type TrackyBackupPreview = {
  appVersion: string | null;
  exportedAt: ISODateTime | null;
  trackerCount: number;
  entryCount: number;
  activityCount: number;
  dateRange: {
    start: ISODateTime;
    end: ISODateTime;
  } | null;
};

export type TrackerDraft = Pick<
  Tracker,
  'name' | 'icon' | 'color' | 'fields' | 'summary'
>;

export type TrackerEntryDraft = Pick<
  TrackedEvent,
  'occurredAt' | 'values' | 'note'
>;
