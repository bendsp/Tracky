import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
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
  makeTheme,
  resolveColorScheme,
  type AppearanceMode,
  type Theme,
} from '../design/theme';
import {
  type ActivityBlock,
  type PersistedTrackyState,
  type Tracker,
  type TrackyBackupEnvelope,
  type TrackerDraft,
  type TrackerEntryDraft,
} from '../domain/models';
import {
  createTrackyBackup,
  CURRENT_DATA_SCHEMA_VERSION,
  isHexColor,
  parseAndMigrateTrackyData,
  replaceStoredTrackyData,
  sanitizeTrackerDraft,
  trackyHydrationErrorMessage,
} from '../storage/trackyData';
import { TrackyPersistenceQueue } from '../storage/TrackyPersistenceQueue';

type TrackyContextValue = PersistedTrackyState & {
  hydrated: boolean;
  loadError: string | null;
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
  exportSnapshot: () => TrackyBackupEnvelope;
  replaceAllData: (replacement: unknown) => Promise<void>;
};

const STORAGE_KEY = 'tracky.v1';

function emptyState(appearance: AppearanceMode = 'system'): PersistedTrackyState {
  return {
    activityTypes: [],
    activities: [],
    trackers: [],
    events: [],
    appearance,
    schemaVersion: CURRENT_DATA_SCHEMA_VERSION,
  };
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const TrackyContext = createContext<TrackyContextValue | null>(null);

export function TrackyProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<PersistedTrackyState>(emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const persistenceQueue = useRef(new TrackyPersistenceQueue());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrate = useCallback(async () => {
    setHydrated(false);
    setLoadError(null);
    setStorageReady(false);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setState(parseAndMigrateTrackyData(stored).state);
      } else {
        setState(emptyState());
      }
      setStorageReady(true);
    } catch (error) {
      setLoadError(trackyHydrationErrorMessage(error));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const persist = useCallback((snapshot: PersistedTrackyState) => {
    const payload = JSON.stringify(snapshot);
    const write = persistenceQueue.current.enqueueSave(() =>
      AsyncStorage.setItem(STORAGE_KEY, payload),
    );
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
    const clean = sanitizeTrackerDraft(draft);
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
    const clean = sanitizeTrackerDraft(draft);
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

  const replaceAllData = useCallback(
    async (replacement: unknown) => {
      await persistenceQueue.current.replace(
        () =>
          replaceStoredTrackyData({
            fallbackCurrentState: stateRef.current,
            key: STORAGE_KEY,
            replacement,
            storage: AsyncStorage,
          }),
        (verified) => {
          stateRef.current = verified;
          setState(verified);
        },
      );
      setLoadError(null);
      setSaveError(false);
      setStorageReady(true);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const exportSnapshot = useCallback(
    () =>
      createTrackyBackup(
        state,
        Constants.expoConfig?.version ?? 'unknown',
      ),
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
      replaceAllData,
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
      replaceAllData,
    ],
  );

  return <TrackyContext.Provider value={value}>{children}</TrackyContext.Provider>;
}

export function useTracky() {
  const context = useContext(TrackyContext);
  if (!context) throw new Error('useTracky must be used within TrackyProvider');
  return context;
}
