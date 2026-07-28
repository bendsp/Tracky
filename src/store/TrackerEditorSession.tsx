import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Tracker, TrackerDraft } from '../domain/models';
import { editableTrackerDraft, newTrackerDraft } from '../domain/trackerDraft';

type TrackerEditorSession = {
  draft: TrackerDraft;
  trackerId?: string;
};

type TrackerEditorSessionValue = {
  begin: (tracker?: Tracker | null) => void;
  clear: () => void;
  session: TrackerEditorSession | null;
  updateDraft: (
    update: TrackerDraft | ((current: TrackerDraft) => TrackerDraft),
  ) => void;
};

const TrackerEditorSessionContext =
  createContext<TrackerEditorSessionValue | null>(null);

export function TrackerEditorSessionProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] = useState<TrackerEditorSession | null>(null);

  const begin = useCallback((tracker?: Tracker | null) => {
    setSession({
      draft: tracker ? editableTrackerDraft(tracker) : newTrackerDraft(),
      trackerId: tracker?.id,
    });
  }, []);

  const clear = useCallback(() => setSession(null), []);

  const updateDraft = useCallback<
    TrackerEditorSessionValue['updateDraft']
  >((update) => {
    setSession((current) => {
      if (!current) return current;
      const draft =
        typeof update === 'function' ? update(current.draft) : update;
      return { ...current, draft };
    });
  }, []);

  const value = useMemo(
    () => ({ begin, clear, session, updateDraft }),
    [begin, clear, session, updateDraft],
  );

  return (
    <TrackerEditorSessionContext.Provider value={value}>
      {children}
    </TrackerEditorSessionContext.Provider>
  );
}

export function useTrackerEditorSession() {
  const value = useContext(TrackerEditorSessionContext);
  if (!value) {
    throw new Error(
      'useTrackerEditorSession must be used within TrackerEditorSessionProvider',
    );
  }
  return value;
}
