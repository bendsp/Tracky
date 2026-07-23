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
import type {
  ActivityBlock,
  ActivityType,
  HexColor,
  PersistedTrackyState,
  Tracker,
  TrackedEvent,
  TrackyExport,
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
  createTracker: (name: string, unit?: string) => string;
  deleteTracker: (id: string) => void;
  logEvent: (
    trackerId: string,
    value?: number,
    note?: string,
    at?: Date,
  ) => void;
  setAppearance: (mode: AppearanceMode) => void;
  retryHydration: () => void;
  retryPersistence: () => void;
  deleteAll: () => Promise<void>;
  exportSnapshot: () => TrackyExport;
};

const STORAGE_KEY = 'tracky.v1';

const initialState: PersistedTrackyState = {
  activityTypes: [],
  activities: [],
  trackers: [],
  events: [],
  appearance: 'system',
};

const TrackyContext = createContext<TrackyContextValue | null>(null);

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isHexColor(value: unknown): value is HexColor {
  return isString(value) && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function readStoredState(value: string): PersistedTrackyState | null {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<PersistedTrackyState>;
  if (
    !Array.isArray(candidate.activities) ||
    !Array.isArray(candidate.trackers) ||
    !Array.isArray(candidate.events)
  ) {
    return null;
  }

  const appearance: AppearanceMode =
    candidate.appearance === 'light' || candidate.appearance === 'dark'
      ? candidate.appearance
      : 'system';
  const storedActivityTypes = Array.isArray(candidate.activityTypes)
    ? candidate.activityTypes.filter(
        (item): item is ActivityType =>
          !!item &&
          isString(item.id) &&
          isString(item.name) &&
          isHexColor(item.color) &&
          isString(item.createdAt) &&
          isString(item.updatedAt),
      )
    : [];
  if (
    Array.isArray(candidate.activityTypes) &&
    storedActivityTypes.length !== candidate.activityTypes.length
  ) {
    return null;
  }
  const activityTypes = [...storedActivityTypes];
  const activities: ActivityBlock[] = [];
  for (const item of candidate.activities) {
    if (
      !item ||
      !isString(item.id) ||
      !isString(item.name) ||
      !isString(item.startedAt) ||
      !(item.endedAt === null || isString(item.endedAt)) ||
      !isString(item.createdAt) ||
      !isString(item.updatedAt)
    ) {
      return null;
    }

    const storedTypeId =
      'activityTypeId' in item && isString(item.activityTypeId)
        ? item.activityTypeId
        : null;
    let activityType =
      activityTypes.find((type) => type.id === storedTypeId) ??
      activityTypes.find(
        (type) => type.name.toLocaleLowerCase() === item.name.toLocaleLowerCase(),
      );
    if (!activityType) {
      activityType = {
        id: `activity_type_migrated_${item.id}`,
        name: item.name,
        color:
          'color' in item && isHexColor(item.color)
            ? item.color
            : accent.primary,
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
  const trackers = candidate.trackers.filter(
    (item): item is Tracker =>
      !!item &&
      isString(item.id) &&
      isString(item.name) &&
      (item.unit === null || isString(item.unit)) &&
      isString(item.createdAt) &&
      isString(item.updatedAt),
  );
  if (trackers.length !== candidate.trackers.length) return null;
  const trackerIds = new Set(trackers.map((tracker) => tracker.id));
  const events = candidate.events.filter(
    (item): item is TrackedEvent =>
      !!item &&
      isString(item.id) &&
      isString(item.trackerId) &&
      trackerIds.has(item.trackerId) &&
      isString(item.occurredAt) &&
      (item.numericValue === null || typeof item.numericValue === 'number') &&
      (item.unit === null || isString(item.unit)) &&
      (item.note === null || isString(item.note)) &&
      isString(item.createdAt) &&
      isString(item.updatedAt),
  );
  if (events.length !== candidate.events.length) return null;

  return { activityTypes, activities, trackers, events, appearance };
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function TrackyProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<PersistedTrackyState>(initialState);
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

  const switchActivity = useCallback(
    (activityTypeId: string, at = new Date()) => {
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
    },
    [],
  );

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
        (endedAt &&
          (!Number.isFinite(endedAt.getTime()) || endedAt <= startedAt))
      ) {
        return false;
      }
      if (!state.activities.some((activity) => activity.id === activityId)) {
        return false;
      }
      const proposedStart = startedAt.getTime();
      const proposedEnd = endedAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const overlapsAnotherActivity = state.activities.some((activity) => {
        if (activity.id === activityId) return false;
        const otherStart = new Date(activity.startedAt).getTime();
        const otherEnd = activity.endedAt
          ? new Date(activity.endedAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (!Number.isFinite(otherStart) || Number.isNaN(otherEnd)) return false;
        return proposedStart < otherEnd && proposedEnd > otherStart;
      });
      if (overlapsAnotherActivity) return false;
      const timestamp = new Date().toISOString();
      setState((previous) => ({
        ...previous,
        activities: previous.activities.map((activity) => {
          if (activity.id !== activityId) return activity;
          return {
            ...activity,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt?.toISOString() ?? null,
            updatedAt: timestamp,
          };
        }),
      }));
      return true;
    },
    [state.activities],
  );

  const createTracker = useCallback((name: string, unit?: string) => {
    const trackerId = id('tracker');
    const timestamp = new Date().toISOString();
    setState((previous) => ({
      ...previous,
      trackers: [
        ...previous.trackers,
        {
          id: trackerId,
          name: name.trim(),
          unit: unit?.trim() || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }));
    return trackerId;
  }, []);

  const deleteTracker = useCallback((trackerId: string) => {
    setState((previous) => ({
      ...previous,
      trackers: previous.trackers.filter((tracker) => tracker.id !== trackerId),
      events: previous.events.filter((event) => event.trackerId !== trackerId),
    }));
  }, []);

  const logEvent = useCallback(
    (
      trackerId: string,
      value?: number,
      note?: string,
      at = new Date(),
    ) => {
      setState((previous) => {
        const tracker = previous.trackers.find((item) => item.id === trackerId);
        if (!tracker) return previous;
        const timestamp = at.toISOString();
        return {
          ...previous,
          events: [
            ...previous.events,
            {
              id: id('event'),
              trackerId,
              occurredAt: timestamp,
              numericValue: Number.isFinite(value) ? (value ?? null) : null,
              unit: tracker.unit,
              note: note?.trim() || null,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
        };
      });
    },
    [],
  );

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
    const clearedState = { ...initialState, appearance: state.appearance };
    setState(clearedState);
    await persist(clearedState);
  }, [persist, state.appearance]);

  const exportSnapshot = useCallback(
    () => ({
      ...state,
      schemaVersion: 2 as const,
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
      deleteTracker,
      logEvent,
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
      deleteTracker,
      logEvent,
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
