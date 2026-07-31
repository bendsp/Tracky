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
  type LocalDate,
  type PersistedTrackyState,
  type RoutineDraft,
  type TaskDraft,
  type Tracker,
  type TrackyBackupEnvelope,
  type TrackerDraft,
  type TrackerEntryDraft,
} from '../domain/models';
import { isLocalDate } from '../domain/planning';
import {
  createRoutine as createRoutineState,
  createTask as createTaskState,
  deleteRoutine as deleteRoutineState,
  deleteTask as deleteTaskState,
  restoreRoutineScheduleDate,
  restoreTrackerScheduleDate,
  skipRoutineScheduleDate,
  skipTrackerScheduleDate,
  toggleRoutineStepCompletion,
  toggleTaskCompletion,
  toggleTrackerCheckInForDate,
  updateRoutine as updateRoutineState,
  updateTask as updateTaskState,
} from '../domain/trackyActions';
import {
  createTrackyBackup,
  CURRENT_DATA_SCHEMA_VERSION,
  isHexColor,
  parseAndMigrateTrackyData,
  replaceStoredTrackyData,
  sanitizeRoutineDraft,
  sanitizeTaskDraft,
  sanitizeTrackerDraft,
  trackyHydrationErrorMessage,
} from '../storage/trackyData';
import { TrackyPersistenceQueue } from '../storage/TrackyPersistenceQueue';
import {
  localDateKey,
  trackerGoalStatus,
} from '../domain/tracking';

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
  toggleTrackerCheckIn: (
    trackerId: string,
    forDate?: LocalDate,
    at?: Date,
  ) => 'logged' | 'completed' | 'uncompleted' | null;
  createTask: (draft: TaskDraft) => string;
  updateTask: (taskId: string, draft: TaskDraft) => void;
  deleteTask: (taskId: string) => void;
  toggleTask: (taskId: string, at?: Date) => boolean | null;
  createRoutine: (draft: RoutineDraft) => string;
  updateRoutine: (routineId: string, draft: RoutineDraft) => void;
  deleteRoutine: (routineId: string) => void;
  toggleRoutineStep: (
    routineId: string,
    forDate: LocalDate,
    stepId: string,
    at?: Date,
  ) => 'completed' | 'uncompleted' | 'progress' | null;
  setScheduleDateSkipped: (
    kind: 'tracker' | 'routine',
    id: string,
    date: LocalDate,
    skipped: boolean,
  ) => void;
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
    tasks: [],
    routines: [],
    routineProgress: [],
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

  const commit = useCallback(
    (
      transition: (current: PersistedTrackyState) => PersistedTrackyState,
    ) => {
      const current = stateRef.current;
      const next = transition(current);
      if (next !== current) {
        stateRef.current = next;
        setState(next);
      }
      return next;
    },
    [],
  );

  const hydrate = useCallback(async () => {
    setHydrated(false);
    setLoadError(null);
    setStorageReady(false);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const hydratedState = stored
        ? parseAndMigrateTrackyData(stored).state
        : emptyState();
      stateRef.current = hydratedState;
      setState(hydratedState);
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
    commit((previous) => {
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
  }, [commit]);

  const createActivityAndSwitch = useCallback(
    (name: string, color: string, at = new Date()) => {
      const cleanName = name.trim();
      if (!cleanName || !isHexColor(color)) return '';
      const activityTypeId = id('activity_type');
      const timestamp = at.toISOString();
      commit((previous) => ({
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
    [commit],
  );

  const stopCurrentActivity = useCallback((at = new Date()) => {
    const timestamp = at.toISOString();
    commit((previous) => ({
      ...previous,
      activities: previous.activities.map((activity) =>
        activity.endedAt === null
          ? { ...activity, endedAt: timestamp, updatedAt: timestamp }
          : activity,
      ),
    }));
  }, [commit]);

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
      commit((previous) => ({
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
    [commit, state.activities],
  );

  const createTracker = useCallback((draft: TrackerDraft) => {
    const clean = sanitizeTrackerDraft(draft);
    if (!clean) return '';
    const trackerId = id('tracker');
    const timestamp = new Date().toISOString();
    commit((previous) => ({
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
  }, [commit]);

  const updateTracker = useCallback((trackerId: string, draft: TrackerDraft) => {
    const clean = sanitizeTrackerDraft(draft);
    if (!clean) return;
    const timestamp = new Date().toISOString();
    commit((previous) => ({
      ...previous,
      trackers: previous.trackers.map((tracker) =>
        tracker.id === trackerId
          ? { ...tracker, ...clean, updatedAt: timestamp }
          : tracker,
      ),
    }));
  }, [commit]);

  const deleteTracker = useCallback((trackerId: string) => {
    commit((previous) => ({
      ...previous,
      trackers: previous.trackers.filter((tracker) => tracker.id !== trackerId),
      events: previous.events.filter((event) => event.trackerId !== trackerId),
    }));
  }, [commit]);

  const reorderTrackers = useCallback((orderedIds: string[]) => {
    commit((previous) => {
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
  }, [commit]);

  const addTrackerChoice = useCallback(
    (trackerId: string, fieldId: string, choice: string) => {
      const cleanChoice = choice.trim();
      if (!cleanChoice) return;
      const timestamp = new Date().toISOString();
      commit((previous) => ({
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
    [commit],
  );

  const logEvent = useCallback(
    (trackerId: string, draft: TrackerEntryDraft) => {
      const tracker = state.trackers.find((item) => item.id === trackerId);
      if (
        !tracker ||
        !Number.isFinite(new Date(draft.occurredAt).getTime()) ||
        !isLocalDate(draft.forDate)
      ) {
        return '';
      }
      const eventId = id('event');
      const timestamp = new Date().toISOString();
      commit((previous) => ({
        ...previous,
        events: [
          ...previous.events,
          {
            id: eventId,
            trackerId,
            occurredAt: draft.occurredAt,
            forDate: draft.forDate,
            values: draft.values,
            note: draft.note?.trim() || null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }));
      return eventId;
    },
    [commit, state.trackers],
  );

  const toggleTrackerCheckIn = useCallback(
    (
      trackerId: string,
      forDate = localDateKey(new Date()),
      at = new Date(),
    ) => {
      if (!Number.isFinite(at.getTime())) return null;
      const snapshot = stateRef.current;
      const tracker = snapshot.trackers.find(
        (candidate) => candidate.id === trackerId,
      );
      if (!tracker || forDate < tracker.goal.startDate) return null;
      const statusAt = new Date(`${forDate}T23:59:59.999`);
      const before = trackerGoalStatus(tracker, snapshot.events, statusAt);
      const nextState = toggleTrackerCheckInForDate(
        snapshot,
        trackerId,
        forDate,
        { id: id('event'), now: at.toISOString() },
      );
      if (nextState === snapshot) return null;
      stateRef.current = nextState;
      setState(nextState);
      const after = trackerGoalStatus(tracker, nextState.events, statusAt);
      if (before.complete && !after.complete) return 'uncompleted';
      if (!before.complete && after.complete) return 'completed';
      return 'logged';
    },
    [],
  );

  const updateEvent = useCallback((eventId: string, draft: TrackerEntryDraft) => {
    if (
      !Number.isFinite(new Date(draft.occurredAt).getTime()) ||
      !isLocalDate(draft.forDate)
    ) return;
    const timestamp = new Date().toISOString();
    commit((previous) => ({
      ...previous,
      events: previous.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              occurredAt: draft.occurredAt,
              forDate: draft.forDate,
              values: draft.values,
              note: draft.note?.trim() || null,
              updatedAt: timestamp,
            }
          : event,
      ),
    }));
  }, [commit]);

  const deleteEvent = useCallback((eventId: string) => {
    commit((previous) => ({
      ...previous,
      events: previous.events.filter((event) => event.id !== eventId),
    }));
  }, [commit]);

  const createTask = useCallback(
    (draft: TaskDraft) => {
      if (!sanitizeTaskDraft(draft)) return '';
      const taskId = id('task');
      const timestamp = new Date().toISOString();
      const current = stateRef.current;
      const next = createTaskState(current, draft, {
        id: taskId,
        now: timestamp,
      });
      if (next === current) return '';
      stateRef.current = next;
      setState(next);
      return taskId;
    },
    [],
  );

  const updateTask = useCallback((taskId: string, draft: TaskDraft) => {
    if (!sanitizeTaskDraft(draft)) return;
    commit((current) =>
      updateTaskState(current, taskId, draft, {
        now: new Date().toISOString(),
      }),
    );
  }, [commit]);

  const deleteTask = useCallback((taskId: string) => {
    commit((current) => deleteTaskState(current, taskId));
  }, [commit]);

  const toggleTask = useCallback((taskId: string, at = new Date()) => {
    if (!Number.isFinite(at.getTime())) return null;
    const current = stateRef.current;
    const next = toggleTaskCompletion(current, taskId, {
      now: at.toISOString(),
    });
    if (next === current) return null;
    stateRef.current = next;
    setState(next);
    return next.tasks.find((task) => task.id === taskId)?.completedAt !== null;
  }, []);

  const createRoutine = useCallback((draft: RoutineDraft) => {
    if (!sanitizeRoutineDraft(draft)) return '';
    const routineId = id('routine');
    const timestamp = new Date().toISOString();
    const current = stateRef.current;
    const next = createRoutineState(current, draft, {
      id: routineId,
      now: timestamp,
    });
    if (next === current) return '';
    stateRef.current = next;
    setState(next);
    return routineId;
  }, []);

  const updateRoutine = useCallback(
    (routineId: string, draft: RoutineDraft) => {
      if (!sanitizeRoutineDraft(draft)) return;
      commit((current) =>
        updateRoutineState(current, routineId, draft, {
          now: new Date().toISOString(),
        }),
      );
    },
    [commit],
  );

  const deleteRoutine = useCallback((routineId: string) => {
    commit((current) => deleteRoutineState(current, routineId));
  }, [commit]);

  const toggleRoutineStep = useCallback(
    (
      routineId: string,
      forDate: LocalDate,
      stepId: string,
      at = new Date(),
    ) => {
      if (!Number.isFinite(at.getTime())) return null;
      const current = stateRef.current;
      const before = current.routineProgress.find(
        (progress) =>
          progress.routineId === routineId && progress.forDate === forDate,
      );
      const beforeStep = before?.steps.find((step) => step.id === stepId);
      const next = toggleRoutineStepCompletion(
        current,
        routineId,
        forDate,
        stepId,
        { id: id('routine_progress'), now: at.toISOString() },
      );
      if (next === current) return null;
      stateRef.current = next;
      setState(next);
      const after = next.routineProgress.find(
        (progress) =>
          progress.routineId === routineId && progress.forDate === forDate,
      );
      if (after?.completedAt) return 'completed';
      if (beforeStep?.completedAt) return 'uncompleted';
      return 'progress';
    },
    [],
  );

  const setScheduleDateSkipped = useCallback(
    (
      kind: 'tracker' | 'routine',
      entityId: string,
      date: LocalDate,
      skipped: boolean,
    ) => {
      const time = { now: new Date().toISOString() };
      commit((current) => {
        if (kind === 'tracker') {
          return skipped
            ? skipTrackerScheduleDate(current, entityId, date, time)
            : restoreTrackerScheduleDate(current, entityId, date, time);
        }
        return skipped
          ? skipRoutineScheduleDate(current, entityId, date, time)
          : restoreRoutineScheduleDate(current, entityId, date, time);
      });
    },
    [commit],
  );

  const setAppearance = useCallback((appearance: AppearanceMode) => {
    commit((previous) => ({ ...previous, appearance }));
  }, [commit]);

  const retryPersistence = useCallback(() => {
    setRetryRevision((revision) => revision + 1);
  }, []);

  const retryHydration = useCallback(() => {
    hydrate();
  }, [hydrate]);

  const deleteAll = useCallback(async () => {
    const clearedState = emptyState(state.appearance);
    stateRef.current = clearedState;
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
      toggleTrackerCheckIn,
      createTask,
      updateTask,
      deleteTask,
      toggleTask,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      toggleRoutineStep,
      setScheduleDateSkipped,
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
      toggleTrackerCheckIn,
      createTask,
      updateTask,
      deleteTask,
      toggleTask,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      toggleRoutineStep,
      setScheduleDateSkipped,
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
