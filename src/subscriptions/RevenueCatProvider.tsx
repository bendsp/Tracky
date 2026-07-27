import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, {
  PAYWALL_RESULT,
} from 'react-native-purchases-ui';

import {
  getRevenueCatConfiguration,
  TRACKY_PLUS_ENTITLEMENT_ID,
} from './revenueCatConfig';
import {
  getPurchaseErrorMessage,
  hasTrackyPlus,
  isPurchaseCancelled,
} from './subscriptionState';

type RevenueCatContextValue = {
  configurationError: string | null;
  customerInfo: CustomerInfo | null;
  isConfigured: boolean;
  isLoading: boolean;
  isPlus: boolean;
  offerings: PurchasesOfferings | null;
  presentCustomerCenter: () => Promise<void>;
  presentPaywall: () => Promise<PAYWALL_RESULT>;
  purchasePackage: (
    packageToPurchase: PurchasesPackage,
  ) => Promise<CustomerInfo | null>;
  refresh: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [configurationError, setConfigurationError] = useState<string | null>(
    null,
  );
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);

  const ensureConfigured = useCallback(() => {
    if (!isConfigured) {
      throw new Error(
        configurationError ?? 'Tracky Plus is not ready yet. Please try again.',
      );
    }
  }, [configurationError, isConfigured]);

  const refresh = useCallback(async () => {
    ensureConfigured();
    const [nextCustomerInfo, nextOfferings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);
    setCustomerInfo(nextCustomerInfo);
    setOfferings(nextOfferings);
    return nextCustomerInfo;
  }, [ensureConfigured]);

  useEffect(() => {
    let active = true;
    let listenerAdded = false;

    const customerInfoListener = (nextCustomerInfo: CustomerInfo) => {
      if (active) setCustomerInfo(nextCustomerInfo);
    };

    async function configure() {
      const configuration = getRevenueCatConfiguration(__DEV__);
      if ('error' in configuration) {
        if (active) {
          setConfigurationError(configuration.error);
          setIsLoading(false);
        }
        return;
      }

      await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey: configuration.apiKey });
      }

      Purchases.addCustomerInfoUpdateListener(customerInfoListener);
      listenerAdded = true;
      if (active) {
        setIsConfigured(true);
        setConfigurationError(null);
      }

      const [initialCustomerInfo, initialOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      if (active) {
        setCustomerInfo(initialCustomerInfo);
        setOfferings(initialOfferings);
        setIsLoading(false);
      }
    }

    configure().catch((error) => {
      if (active) {
        setConfigurationError(
          getPurchaseErrorMessage(
            error,
            'Tracky could not connect to the purchase service.',
          ),
        );
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      if (listenerAdded) {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      }
    };
  }, []);

  const presentPaywall = useCallback(async () => {
    ensureConfigured();
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      displayCloseButton: true,
      offering: offerings?.current ?? undefined,
      requiredEntitlementIdentifier: TRACKY_PLUS_ENTITLEMENT_ID,
    });

    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      await refresh();
    }

    if (result === PAYWALL_RESULT.ERROR) {
      throw new Error('RevenueCat could not present the Tracky Plus paywall.');
    }

    return result;
  }, [ensureConfigured, offerings?.current, refresh]);

  const purchasePackage = useCallback(
    async (packageToPurchase: PurchasesPackage) => {
      ensureConfigured();
      try {
        const result = await Purchases.purchasePackage(packageToPurchase);
        setCustomerInfo(result.customerInfo);
        return result.customerInfo;
      } catch (error) {
        if (isPurchaseCancelled(error)) return null;
        throw error;
      }
    },
    [ensureConfigured],
  );

  const restorePurchases = useCallback(async () => {
    ensureConfigured();
    const restoredCustomerInfo = await Purchases.restorePurchases();
    setCustomerInfo(restoredCustomerInfo);
    return restoredCustomerInfo;
  }, [ensureConfigured]);

  const presentCustomerCenter = useCallback(async () => {
    ensureConfigured();
    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: ({ customerInfo: restoredCustomerInfo }) => {
          setCustomerInfo(restoredCustomerInfo);
        },
      },
    });
    await refresh();
  }, [ensureConfigured, refresh]);

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      configurationError,
      customerInfo,
      isConfigured,
      isLoading,
      isPlus: hasTrackyPlus(customerInfo),
      offerings,
      presentCustomerCenter,
      presentPaywall,
      purchasePackage,
      refresh,
      restorePurchases,
    }),
    [
      configurationError,
      customerInfo,
      isConfigured,
      isLoading,
      offerings,
      presentCustomerCenter,
      presentPaywall,
      purchasePackage,
      refresh,
      restorePurchases,
    ],
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const value = useContext(RevenueCatContext);
  if (!value) {
    throw new Error('useRevenueCat must be used inside RevenueCatProvider.');
  }
  return value;
}
