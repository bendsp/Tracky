import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  accent,
  makeTheme,
  resolveColorScheme,
  type AppearanceMode,
  type Theme,
} from '../design/theme';
import {
  trackerIconNames,
  type ActivityBlock,
  type ActivityType,
  type HexColor,
  type PersistedTrackyState,
  type TrackedEvent,
  type Tracker,
  type TrackerDraft,
  type TrackerEntryDraft,
  type TrackerField,
  type TrackerIconName,
  type TrackerSummary,
  type TrackyExport,
} from '../domain/models';

type TrackyContextValue = PersistedTrackyState & {
  hydrated: boolean;
  loadError: boolean;
  saveError: boolean;
  theme: Theme;
  currentActivity: ActivityBlock | null;
  switchActivity: (activityTypeId: string, at?: Date) => void;
  createActivityAndSwitch: (name: string, color: string, at?: Date) => string;
  stopCurrentActivity: (at?: Date) => void;
  updateActivityTimes: (
    activityId: string,
    startedAt: Date,
    endedAt: Date | null,
  ) => boolean;
  createTracker: (draft: TrackerDraft) => string;
  updateTracker: (trackerId: string, draft: TrackerDraft) => void;
  deleteTracker: (id: string) => void;
  reorderTrackers: (orderedIds: string[]) => void;
  addTrackerChoice: (trackerId: string, fieldId: string, choice: string) => void;
  logEvent: (trackerId: string, draft: TrackerEntryDraft) => string;
  updateEvent: (eventId: string, draft: TrackerEntryDraft) => void;
  deleteEvent: (eventId: string) => void;
  setAppearance: (mode: AppearanceMode) => void;
  retryHydration: () => void;
  retryPersistence: () => void;
  deleteAll: () => Promise<void>;
  exportSnapshot: () => TrackyExport;
};

const STORAGE_KEY = 'tracky.v1';

function emptyState(appearance: AppearanceMode = 'system'): PersistedTrackyState {
  return {
    activityTypes: [],
    activities: [],
    trackers: [],
    events: [],
    appearance,
    schemaVersion: 3,
  };
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function freshState(): PersistedTrackyState {
  const timestamp = new Date().toISOString();
  const drinkingId = id('tracker');
  const drinkTypeFieldId = id('field');
  const amountFieldId = id('field');
  const meditationId = id('tracker');
  return {
    ...emptyState(),
    trackers: [
      {
        id: drinkingId,
        name: 'Drinking',
        icon: 'droplet',
        color: '#3578F6',
        fields: [
          {
            id: drinkTypeFieldId,
            name: 'Drink',
            type: 'choice',
            choices: ['Water', 'Coffee', 'Tea'],
          },
          {
            id: amountFieldId,
            name: 'Amount',
            type: 'number',
            unit: 'ml',
          },
        ],
        summary: {
          calculation: 'sum',
          timeframe: 'today',
          fieldId: amountFieldId,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: meditationId,
        name: 'Meditation',
        icon: 'meditation',
        color: '#8A5CC7',
        fields: [],
        summary: {
          calculation: 'count',
          timeframe: 'thisWeek',
          countLabel: 'sessions',
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

const TrackyContext = createContext<TrackyContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isHexColor(value: unknown): value is HexColor {
  return isString(value) && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isTrackerIcon(value: unknown): value is TrackerIconName {
  return isString(value) && trackerIconNames.includes(value as TrackerIconName);
}

function readField(value: unknown): TrackerField | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isString(value.name) ||
    !isString(value.type)
  ) {
    return null;
  }
  if (value.type === 'choice') {
    if (!Array.isArray(value.choices) || !value.choices.every(isString)) return null;
    return {
      id: value.id,
      name: value.name,
      type: 'choice',
      choices: [...new Set(value.choices.map((choice) => choice.trim()).filter(Boolean))],
    };
  }
  if (value.type === 'number') {
    if (!(value.unit === null || isString(value.unit))) return null;
    return {
      id: value.id,
      name: value.name,
      type: 'number',
      unit: value.unit?.trim() || null,
    };
  }
  if (value.type === 'date') {
    return { id: value.id, name: value.name, type: 'date' };
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
    !isString(value.id) ||
    !isString(value.name) ||
    !isTrackerIcon(value.icon) ||
    !isHexColor(value.color) ||
    !Array.isArray(value.fields) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
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
    name: value.name,
    icon: value.icon,
    color: value.color,
    fields: validFields,
    summary,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readEvent(value: unknown, trackerIds: Set<string>): TrackedEvent | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isString(value.trackerId) ||
    !trackerIds.has(value.trackerId) ||
    !isString(value.occurredAt) ||
    !isRecord(value.values) ||
    !(value.note === null || isString(value.note)) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
  ) {
    return null;
  }
  const values = Object.fromEntries(
    Object.entries(value.values).filter(
      ([, fieldValue]) =>
        fieldValue === null ||
        isString(fieldValue) ||
        (typeof fieldValue === 'number' && Number.isFinite(fieldValue)),
    ),
  ) as Record<string, string | number | null>;
  if (Object.keys(values).length !== Object.keys(value.values).length) return null;
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

function readActivities(candidate: Record<string, unknown>) {
  if (!Array.isArray(candidate.activities)) return null;
  const storedTypes = Array.isArray(candidate.activityTypes)
    ? candidate.activityTypes.filter(
        (item): item is ActivityType =>
          isRecord(item) &&
          isString(item.id) &&
          isString(item.name) &&
          isHexColor(item.color) &&
          isString(item.createdAt) &&
          isString(item.updatedAt),
      )
    : [];
  if (
    Array.isArray(candidate.activityTypes) &&
    storedTypes.length !== candidate.activityTypes.length
  ) {
    return null;
  }
  const activityTypes = [...storedTypes];
  const activities: ActivityBlock[] = [];
  for (const item of candidate.activities) {
    if (
      !isRecord(item) ||
      !isString(item.id) ||
      !isString(item.name) ||
      !isString(item.startedAt) ||
      !(item.endedAt === null || isString(item.endedAt)) ||
      !isString(item.createdAt) ||
      !isString(item.updatedAt)
    ) {
      return null;
    }
    const storedTypeId = isString(item.activityTypeId) ? item.activityTypeId : null;
    const itemName = item.name;
    let activityType =
      activityTypes.find((type) => type.id === storedTypeId) ??
      activityTypes.find(
        (type) => type.name.toLocaleLowerCase() === itemName.toLocaleLowerCase(),
      );
    if (!activityType) {
      activityType = {
        id: `activity_type_migrated_${item.id}`,
        name: itemName,
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

function appearanceFrom(candidate: Record<string, unknown>): AppearanceMode {
  return candidate.appearance === 'light' || candidate.appearance === 'dark'
    ? candidate.appearance
    : 'system';
}

function readVersionThree(
  candidate: Record<string, unknown>,
  activityData: { activities: ActivityBlock[]; activityTypes: ActivityType[] },
): PersistedTrackyState | null {
  if (!Array.isArray(candidate.trackers) || !Array.isArray(candidate.events)) {
    return null;
  }
  const trackers = candidate.trackers.map(readTracker);
  if (trackers.some((tracker) => !tracker)) return null;
  const validTrackers = trackers as Tracker[];
  const trackerIds = new Set(validTrackers.map((tracker) => tracker.id));
  const events = candidate.events.map((event) => readEvent(event, trackerIds));
  if (events.some((event) => !event)) return null;
  return {
    ...activityData,
    trackers: validTrackers,
    events: events as TrackedEvent[],
    appearance: appearanceFrom(candidate),
    schemaVersion: 3,
  };
}

function migrateLegacy(
  candidate: Record<string, unknown>,
  activityData: { activities: ActivityBlock[]; activityTypes: ActivityType[] },
): PersistedTrackyState | null {
  if (!Array.isArray(candidate.trackers) || !Array.isArray(candidate.events)) {
    return null;
  }
  const legacyEvents = candidate.events.filter(isRecord);
  if (legacyEvents.length !== candidate.events.length) return null;
  const trackers: Tracker[] = [];
  const numberFields = new Map<string, string>();
  for (const raw of candidate.trackers) {
    if (
      !isRecord(raw) ||
      !isString(raw.id) ||
      !isString(raw.name) ||
      !(raw.unit === null || isString(raw.unit)) ||
      !isString(raw.createdAt) ||
      !isString(raw.updatedAt)
    ) {
      return null;
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
      name: raw.name,
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
      !isString(raw.id) ||
      !isString(raw.trackerId) ||
      !trackerIds.has(raw.trackerId) ||
      !isString(raw.occurredAt) ||
      !(raw.numericValue === null ||
        (typeof raw.numericValue === 'number' && Number.isFinite(raw.numericValue))) ||
      !(raw.note === null || isString(raw.note)) ||
      !isString(raw.createdAt) ||
      !isString(raw.updatedAt)
    ) {
      return null;
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

function readStoredState(value: string): PersistedTrackyState | null {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) return null;
  const activityData = readActivities(parsed);
  if (!activityData) return null;
  return parsed.schemaVersion === 3
    ? readVersionThree(parsed, activityData)
    : migrateLegacy(parsed, activityData);
}

function sanitizedDraft(draft: TrackerDraft): TrackerDraft | null {
  const name = draft.name.trim();
  if (!name || !isTrackerIcon(draft.icon) || !isHexColor(draft.color)) return null;
  const fields = draft.fields.map(readField);
  if (fields.some((field) => !field)) return null;
  const validFields = fields as TrackerField[];
  const summary = readSummary(draft.summary, validFields);
  if (!summary) return null;
  return { name, icon: draft.icon, color: draft.color, fields: validFields, summary };
}

export function TrackyProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<PersistedTrackyState>(emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrate = useCallback(async () => {
    setHydrated(false);
    setLoadError(false);
    setStorageReady(false);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = readStoredState(stored);
        if (!parsed) {
          setLoadError(true);
          return;
        }
        setState(parsed);
      } else {
        setState(freshState());
      }
      setStorageReady(true);
    } catch {
      setLoadError(true);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const persist = useCallback((snapshot: PersistedTrackyState) => {
    const payload = JSON.stringify(snapshot);
    const write = saveQueue.current.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, payload),
    );
    saveQueue.current = write.catch(() => undefined);
    return write.then(
      () => {
        setSaveError(false);
        if (retryTimer.current) clearTimeout(retryTimer.current);
      },
      (error: unknown) => {
        setSaveError(true);
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(
          () => setRetryRevision((revision) => revision + 1),
          2_000,
        );
        throw error;
      },
    );
  }, []);

  useEffect(() => {
    if (!hydrated || !storageReady) return;
    persist(state).catch(() => undefined);
  }, [hydrated, persist, retryRevision, state, storageReady]);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const currentActivity =
    state.activities.find((activity) => activity.endedAt === null) ?? null;

  const switchActivity = useCallback((activityTypeId: string, at = new Date()) => {
    const timestamp = at.toISOString();
    setState((previous) => {
      const activityType = previous.activityTypes.find(
        (item) => item.id === activityTypeId,
      );
      if (!activityType) return previous;
      return {
        ...previous,
        activities: [
          ...previous.activities.map((activity) =>
            activity.endedAt === null
              ? { ...activity, endedAt: timestamp, updatedAt: timestamp }
              : activity,
          ),
          {
            id: id('activity'),
            activityTypeId: activityType.id,
            name: activityType.name,
            color: activityType.color,
            startedAt: timestamp,
            endedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      };
    });
  }, []);

  const createActivityAndSwitch = useCallback(
    (name: string, color: string, at = new Date()) => {
      const cleanName = name.trim();
      if (!cleanName || !isHexColor(color)) return '';
      const activityTypeId = id('activity_type');
      const timestamp = at.toISOString();
      setState((previous) => ({
        ...previous,
        activityTypes: [
          ...previous.activityTypes,
          {
            id: activityTypeId,
            name: cleanName,
            color,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        activities: [
          ...previous.activities.map((activity) =>
            activity.endedAt === null
              ? { ...activity, endedAt: timestamp, updatedAt: timestamp }
              : activity,
          ),
          {
            id: id('activity'),
            activityTypeId,
            name: cleanName,
            color,
            startedAt: timestamp,
            endedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }));
      return activityTypeId;
    },
    [],
  );

  const stopCurrentActivity = useCallback((at = new Date()) => {
    const timestamp = at.toISOString();
    setState((previous) => ({
      ...previous,
      activities: previous.activities.map((activity) =>
        activity.endedAt === null
          ? { ...activity, endedAt: timestamp, updatedAt: timestamp }
          : activity,
      ),
    }));
  }, []);

  const updateActivityTimes = useCallback(
    (activityId: string, startedAt: Date, endedAt: Date | null) => {
      if (
        !Number.isFinite(startedAt.getTime()) ||
        (!endedAt && startedAt > new Date()) ||
        (endedAt && (!Number.isFinite(endedAt.getTime()) || endedAt <= startedAt))
      ) {
        return false;
      }
      if (!state.activities.some((activity) => activity.id === activityId)) {
        return false;
      }
      const proposedStart = startedAt.getTime();
      const proposedEnd = endedAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const overlaps = state.activities.some((activity) => {
        if (activity.id === activityId) return false;
        const otherStart = new Date(activity.startedAt).getTime();
        const otherEnd = activity.endedAt
          ? new Date(activity.endedAt).getTime()
          : Number.POSITIVE_INFINITY;
        return proposedStart < otherEnd && proposedEnd > otherStart;
      });
      if (overlaps) return false;
      const timestamp = new Date().toISOString();
      setState((previous) => ({
        ...previous,
        activities: previous.activities.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt?.toISOString() ?? null,
                updatedAt: timestamp,
              }
            : activity,
        ),
      }));
      return true;
    },
    [state.activities],
  );

  const createTracker = useCallback((draft: TrackerDraft) => {
    const clean = sanitizedDraft(draft);
    if (!clean) return '';
    const trackerId = id('tracker');
    const timestamp = new Date().toISOString();
    setState((previous) => ({
      ...previous,
      trackers: [
        ...previous.trackers,
        {
          id: trackerId,
          ...clean,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }));
    return trackerId;
  }, []);

  const updateTracker = useCallback((trackerId: string, draft: TrackerDraft) => {
    const clean = sanitizedDraft(draft);
    if (!clean) return;
    const timestamp = new Date().toISOString();
    setState((previous) => ({
      ...previous,
      trackers: previous.trackers.map((tracker) =>
        tracker.id === trackerId
          ? { ...tracker, ...clean, updatedAt: timestamp }
          : tracker,
      ),
    }));
  }, []);

  const deleteTracker = useCallback((trackerId: string) => {
    setState((previous) => ({
      ...previous,
      trackers: previous.trackers.filter((tracker) => tracker.id !== trackerId),
      events: previous.events.filter((event) => event.trackerId !== trackerId),
    }));
  }, []);

  const reorderTrackers = useCallback((orderedIds: string[]) => {
    setState((previous) => {
      if (
        orderedIds.length !== previous.trackers.length ||
        new Set(orderedIds).size !== orderedIds.length
      ) {
        return previous;
      }
      const trackersById = new Map(
        previous.trackers.map((tracker) => [tracker.id, tracker] as const),
      );
      const ordered = orderedIds.map((trackerId) => trackersById.get(trackerId));
      if (ordered.some((tracker) => !tracker)) return previous;
      return { ...previous, trackers: ordered as Tracker[] };
    });
  }, []);

  const addTrackerChoice = useCallback(
    (trackerId: string, fieldId: string, choice: string) => {
      const cleanChoice = choice.trim();
      if (!cleanChoice) return;
      const timestamp = new Date().toISOString();
      setState((previous) => ({
        ...previous,
        trackers: previous.trackers.map((tracker) => {
          if (tracker.id !== trackerId) return tracker;
          return {
            ...tracker,
            updatedAt: timestamp,
            fields: tracker.fields.map((field) => {
              if (field.id !== fieldId || field.type !== 'choice') return field;
              const existing = field.choices.find(
                (candidate) =>
                  candidate.toLocaleLowerCase() === cleanChoice.toLocaleLowerCase(),
              );
              return existing
                ? field
                : { ...field, choices: [...field.choices, cleanChoice] };
            }),
          };
        }),
      }));
    },
    [],
  );

  const logEvent = useCallback(
    (trackerId: string, draft: TrackerEntryDraft) => {
      const tracker = state.trackers.find((item) => item.id === trackerId);
      if (!tracker || !Number.isFinite(new Date(draft.occurredAt).getTime())) {
        return '';
      }
      const eventId = id('event');
      const timestamp = new Date().toISOString();
      setState((previous) => ({
        ...previous,
        events: [
          ...previous.events,
          {
            id: eventId,
            trackerId,
            occurredAt: draft.occurredAt,
            values: draft.values,
            note: draft.note?.trim() || null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }));
      return eventId;
    },
    [state.trackers],
  );

  const updateEvent = useCallback((eventId: string, draft: TrackerEntryDraft) => {
    if (!Number.isFinite(new Date(draft.occurredAt).getTime())) return;
    const timestamp = new Date().toISOString();
    setState((previous) => ({
      ...previous,
      events: previous.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              occurredAt: draft.occurredAt,
              values: draft.values,
              note: draft.note?.trim() || null,
              updatedAt: timestamp,
            }
          : event,
      ),
    }));
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setState((previous) => ({
      ...previous,
      events: previous.events.filter((event) => event.id !== eventId),
    }));
  }, []);

  const setAppearance = useCallback((appearance: AppearanceMode) => {
    setState((previous) => ({ ...previous, appearance }));
  }, []);

  const retryPersistence = useCallback(() => {
    setRetryRevision((revision) => revision + 1);
  }, []);

  const retryHydration = useCallback(() => {
    hydrate();
  }, [hydrate]);

  const deleteAll = useCallback(async () => {
    const clearedState = emptyState(state.appearance);
    setState(clearedState);
    await persist(clearedState);
  }, [persist, state.appearance]);

  const exportSnapshot = useCallback(
    () => ({
      ...state,
      exportedAt: new Date().toISOString(),
    }),
    [state],
  );

  const theme = useMemo(
    () => makeTheme(resolveColorScheme(state.appearance, systemScheme)),
    [state.appearance, systemScheme],
  );

  const value = useMemo<TrackyContextValue>(
    () => ({
      ...state,
      hydrated,
      loadError,
      saveError,
      theme,
      currentActivity,
      switchActivity,
      createActivityAndSwitch,
      stopCurrentActivity,
      updateActivityTimes,
      createTracker,
      updateTracker,
      deleteTracker,
      reorderTrackers,
      addTrackerChoice,
      logEvent,
      updateEvent,
      deleteEvent,
      setAppearance,
      retryHydration,
      retryPersistence,
      deleteAll,
      exportSnapshot,
    }),
    [
      state,
      hydrated,
      loadError,
      saveError,
      theme,
      currentActivity,
      switchActivity,
      createActivityAndSwitch,
      stopCurrentActivity,
      updateActivityTimes,
      createTracker,
      updateTracker,
      deleteTracker,
      reorderTrackers,
      addTrackerChoice,
      logEvent,
      updateEvent,
      deleteEvent,
      setAppearance,
      retryHydration,
      retryPersistence,
      deleteAll,
      exportSnapshot,
    ],
  );

  return <TrackyContext.Provider value={value}>{children}</TrackyContext.Provider>;
}

export function useTracky() {
  const context = useContext(TrackyContext);
  if (!context) throw new Error('useTracky must be used within TrackyProvider');
  return context;
}
