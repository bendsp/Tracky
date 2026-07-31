import type { AppearanceMode } from '../design/theme';

export type EntityId = string;
export type ISODateTime = string;
export type LocalDate = string;
export type LocalTime = string;
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
  'computer',
  'food',
  'music',
  'sleep',
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

export type TrackerGoalPeriod = 'day' | 'week' | 'month';

export type TrackerGoal = {
  targetCount: number;
  period: TrackerGoalPeriod;
  startDate: LocalDate;
};

export type ISOWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ScheduleRecurrence =
  | { frequency: 'daily'; interval: number }
  | {
      frequency: 'weekly';
      interval: number;
      weekdays: ISOWeekday[];
    };

export type ScheduleException = {
  date: LocalDate;
  behavior: 'include' | 'skip';
};

/**
 * When a standing item belongs in the day. This is intentionally separate
 * from a tracker's goal: "three times a week" describes progress, while this
 * schedule describes which days should offer the action.
 */
export type DaySchedule = {
  exceptions: ScheduleException[];
  recurrence: ScheduleRecurrence;
  startDate: LocalDate;
  time: LocalTime | null;
};

export type Tracker = EntityTimestamps & {
  id: EntityId;
  name: string;
  icon: TrackerIconName;
  color: HexColor;
  goal: TrackerGoal;
  schedule: DaySchedule;
  fields: TrackerField[];
  summary: TrackerSummary;
};

export type TrackerEntryValue = string | number | null;

export type TrackedEvent = EntityTimestamps & {
  id: EntityId;
  trackerId: EntityId;
  occurredAt: ISODateTime;
  forDate: LocalDate;
  values: Record<EntityId, TrackerEntryValue>;
  note: string | null;
};

export type Task = EntityTimestamps & {
  id: EntityId;
  name: string;
  scheduledDate: LocalDate;
  time: LocalTime | null;
  completedAt: ISODateTime | null;
};

export type RoutineStep = {
  id: EntityId;
  name: string;
};

export type Routine = EntityTimestamps & {
  id: EntityId;
  name: string;
  icon: TrackerIconName;
  color: HexColor;
  schedule: DaySchedule;
  steps: RoutineStep[];
};

export type RoutineRunStep = RoutineStep & {
  completedAt: ISODateTime | null;
};

export type RoutineProgress = EntityTimestamps & {
  id: EntityId;
  routineId: EntityId;
  forDate: LocalDate;
  /** Snapshot the run so later template edits do not rewrite its history. */
  steps: RoutineRunStep[];
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
};

export type TrackyData = {
  activityTypes: ActivityType[];
  activities: ActivityBlock[];
  trackers: Tracker[];
  events: TrackedEvent[];
  tasks: Task[];
  routines: Routine[];
  routineProgress: RoutineProgress[];
};

export type PersistedTrackyState = TrackyData & {
  appearance: AppearanceMode;
  schemaVersion: 7;
};

export type TrackyBackupEnvelope = {
  format: 'tracky-backup';
  formatVersion: 1;
  dataSchemaVersion: 7;
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
  'name' | 'icon' | 'color' | 'goal' | 'schedule' | 'fields' | 'summary'
>;

export type TrackerEntryDraft = Pick<
  TrackedEvent,
  'occurredAt' | 'forDate' | 'values' | 'note'
>;

export type TaskDraft = Pick<
  Task,
  'name' | 'scheduledDate' | 'time'
>;

export type RoutineDraft = Pick<
  Routine,
  'name' | 'icon' | 'color' | 'schedule' | 'steps'
>;
