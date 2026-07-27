import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRevenueCatConfiguration,
  REVENUECAT_PRODUCT_IDS,
  TRACKY_PLUS_ENTITLEMENT_ID,
} from '../src/subscriptions/revenueCatConfig';
import {
  getPurchaseErrorMessage,
  hasTrackyPlus,
  isPurchaseCancelled,
} from '../src/subscriptions/subscriptionState';

test('checks the exact Tracky Plus entitlement identifier', () => {
  assert.equal(
    hasTrackyPlus({
      entitlements: {
        active: {
          [TRACKY_PLUS_ENTITLEMENT_ID]: { identifier: TRACKY_PLUS_ENTITLEMENT_ID },
        },
      },
    } as never),
    true,
  );

  assert.equal(
    hasTrackyPlus({
      entitlements: { active: { 'tracky-plus': { identifier: 'tracky-plus' } } },
    } as never),
    false,
  );
});

test('keeps the configured RevenueCat product identifiers stable', () => {
  assert.deepEqual(REVENUECAT_PRODUCT_IDS, {
    lifetime: 'lifetime',
    monthly: 'monthly',
    yearly: 'yearly',
  });
});

test('uses the development Test Store key only for development', () => {
  const previousKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'test_example';

  try {
    assert.deepEqual(getRevenueCatConfiguration(true), {
      apiKey: 'test_example',
      environment: 'development',
    });
  } finally {
    restoreEnvironmentVariable(
      'EXPO_PUBLIC_REVENUECAT_API_KEY',
      previousKey,
    );
  }
});

test('rejects a Test Store key in production', () => {
  const previousKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'test_wrong_key';

  try {
    const configuration = getRevenueCatConfiguration(false);
    assert.equal(configuration.apiKey, null);
    assert.match(
      'error' in configuration ? configuration.error : '',
      /Test Store key/,
    );
  } finally {
    restoreEnvironmentVariable(
      'EXPO_PUBLIC_REVENUECAT_API_KEY',
      previousKey,
    );
  }
});

test('accepts an iOS public SDK key in production', () => {
  const previousKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'appl_example';

  try {
    assert.deepEqual(getRevenueCatConfiguration(false), {
      apiKey: 'appl_example',
      environment: 'production',
    });
  } finally {
    restoreEnvironmentVariable(
      'EXPO_PUBLIC_REVENUECAT_API_KEY',
      previousKey,
    );
  }
});

test('recognizes cancellation and returns useful purchase errors', () => {
  const cancellation = { code: '1', message: 'Purchase was cancelled.' };
  assert.equal(isPurchaseCancelled(cancellation), true);
  assert.equal(getPurchaseErrorMessage(cancellation), 'Purchase was cancelled.');
  assert.equal(getPurchaseErrorMessage(null, 'Fallback'), 'Fallback');
});

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
