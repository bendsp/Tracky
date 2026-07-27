import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyTrackerDetailRedirect() {
  const { trackerId } = useLocalSearchParams<{ trackerId: string }>();

  return (
    <Redirect
      href={{
        pathname: '/tracker-detail',
        params: { trackerId },
      }}
    />
  );
}
