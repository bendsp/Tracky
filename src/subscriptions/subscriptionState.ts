import type {
  CustomerInfo,
  PurchasesError,
} from 'react-native-purchases';

import { TRACKY_PLUS_ENTITLEMENT_ID } from './revenueCatConfig';

export function hasTrackyPlus(customerInfo: CustomerInfo | null | undefined) {
  return Boolean(
    customerInfo?.entitlements.active[TRACKY_PLUS_ENTITLEMENT_ID],
  );
}

export function isPurchaseCancelled(error: unknown) {
  return isPurchasesError(error) && error.code === '1';
}

export function getPurchaseErrorMessage(
  error: unknown,
  fallback = 'Please try again in a moment.',
) {
  if (isPurchasesError(error) && error.message.trim()) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
