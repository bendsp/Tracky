export const TRACKY_PLUS_ENTITLEMENT_ID = 'Tracky Plus';

export const REVENUECAT_PRODUCT_IDS = {
  lifetime: 'lifetime',
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

export type RevenueCatConfiguration =
  | { apiKey: string; environment: 'development' | 'production' }
  | { apiKey: null; environment: 'development' | 'production'; error: string };

export function getRevenueCatConfiguration(
  development: boolean,
): RevenueCatConfiguration {
  const environment = development ? 'development' : 'production';
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

  if (!apiKey) {
    return {
      apiKey: null,
      environment,
      error: development
        ? 'RevenueCat is not configured for this development build.'
        : 'Tracky Plus is temporarily unavailable because the production purchase key is missing.',
    };
  }

  if (!development && apiKey.startsWith('test_')) {
    return {
      apiKey: null,
      environment,
      error:
        'Tracky Plus is unavailable because this release was configured with a RevenueCat Test Store key.',
    };
  }

  return { apiKey, environment };
}
