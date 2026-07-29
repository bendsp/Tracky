import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

const ONBOARDING_STORAGE_KEY = 'tracky.onboarding.v1';

type OnboardingContextValue = {
  completed: boolean;
  completeOnboarding: () => Promise<void>;
  ready: boolean;
  replayOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [completed, setCompleted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setCompleted(value === 'completed'))
      .catch(() => setCompleted(false))
      .finally(() => setReady(true));
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'completed');
    setCompleted(true);
  }, []);

  const replayOnboarding = useCallback(() => {
    // Replaying is a transient presentation choice. Keep the durable completion
    // marker so closing the app midway does not turn the introduction back into
    // a required first-launch flow.
    setCompleted(false);
  }, []);

  const value = useMemo(
    () => ({
      completed,
      completeOnboarding,
      ready,
      replayOnboarding,
    }),
    [completed, completeOnboarding, ready, replayOnboarding],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
