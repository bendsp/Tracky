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

export type Tracker = EntityTimestamps & {
  id: EntityId;
  name: string;
  unit: string | null;
};

export type TrackedEvent = EntityTimestamps & {
  id: EntityId;
  trackerId: EntityId;
  occurredAt: ISODateTime;
  numericValue: number | null;
  unit: string | null;
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
};

export type TrackyExport = PersistedTrackyState & {
  exportedAt: ISODateTime;
  schemaVersion: 2;
};
