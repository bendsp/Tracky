# RevenueCat setup for Tracky

Tracky uses RevenueCat for an anonymous, account-free `Tracky Plus` purchase
state. Tracker names, fields, activity records, entries, and notes stay in
Tracky's local storage and are never sent to RevenueCat.

## 1. Local SDK installation

The SDKs are installed with Expo's version-aware installer:

```sh
npx expo install react-native-purchases react-native-purchases-ui
```

`react-native-purchases` handles products, purchases, restores, offerings, and
customer information. `react-native-purchases-ui` supplies RevenueCat's native
Paywall and Customer Center.

These packages contain native code. After installing or upgrading them, rebuild
the iOS development client; restarting Metro alone is not sufficient:

```sh
npx expo run:ios
```

## 2. API keys and build safety

Expo exposes `EXPO_PUBLIC_` variables in the compiled app. RevenueCat public SDK
keys are designed to be embedded in the app, but private RevenueCat secret API
keys must never be used here.

For local development, `.env.local` contains the supplied Test Store key:

```dotenv
EXPO_PUBLIC_REVENUECAT_API_KEY=test_XCZIkpxzPnQGClAnwEElZJasgUE
```

Before a TestFlight or App Store archive, add the public iOS app-specific key
from **RevenueCat > Project settings > API keys**:

```dotenv
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_your_ios_public_sdk_key
```

The app accepts a Test Store key only when `__DEV__` is true. A missing
production key, or a production key beginning with `test_`, leaves Tracky Plus
unavailable instead of allowing test purchases into a shipped app.

For a local release archive, override the ignored `.env.local` value in the
process that bundles the app:

```sh
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_your_ios_public_sdk_key \
  npx expo run:ios --configuration Release
```

The already-exported shell variable takes precedence over `.env.local`. For
remote EAS builds, configure this same public variable in the selected EAS
environment rather than relying on ignored `.env.local`.

## 3. App Store Connect products

Create these products for bundle ID `com.bendsp.tracky`:

| Tracky plan | Product ID | Apple product type |
| --- | --- | --- |
| Lifetime | `lifetime` | Non-Consumable In-App Purchase |
| Yearly | `yearly` | Auto-Renewable Subscription, 1 year |
| Monthly | `monthly` | Auto-Renewable Subscription, 1 month |

Put `yearly` and `monthly` in the same subscription group so a customer has one
subscription tier at a time. Add App Store localization, pricing, review notes,
and a review screenshot for every product. Lifetime is intentionally outside
the subscription group because it is a one-time non-consumable purchase.

## 4. RevenueCat product catalog

1. Add Tracky's iOS app to the RevenueCat project with bundle ID
   `com.bendsp.tracky`.
2. Connect App Store Connect credentials and import `lifetime`, `yearly`, and
   `monthly` into **Product catalog > Products**.
3. Create one entitlement whose identifier is exactly `Tracky Plus`.
   Identifiers are case-sensitive.
4. Attach all three products to `Tracky Plus`. Monthly and yearly grant it
   while their subscription is active; lifetime grants it permanently.
5. Create an offering (for example, identifier `default`) and make it the
   project's **Current** offering.
6. Add the standard RevenueCat packages:
   - `$rc_lifetime` → `lifetime`
   - `$rc_annual` → `yearly`
   - `$rc_monthly` → `monthly`

Tracky fetches `offerings.current`; it does not hard-code the offering
identifier. This lets pricing presentation, targeting, and experiments change
in RevenueCat without an app update.

## 5. Paywall

In **RevenueCat > Paywalls**, create and publish a paywall for the current
offering. Include:

- Lifetime, yearly, and monthly packages.
- A visible close button.
- Restore Purchases.
- Links to Tracky's privacy policy and the applicable terms of use.
- Clear billing period, trial, renewal, and cancellation wording.

Settings calls `RevenueCatUI.presentPaywallIfNeeded` with
`requiredEntitlementIdentifier: "Tracky Plus"`. RevenueCat therefore avoids
showing the paywall to an already-entitled customer. A purchased or restored
result triggers a fresh `CustomerInfo` and offering fetch.

## 6. Customer information and entitlement access

`RevenueCatProvider` configures Purchases once near the app root, retrieves
`CustomerInfo`, registers `addCustomerInfoUpdateListener`, and exposes:

```ts
const {
  customerInfo,
  isPlus,
  offerings,
  refresh,
} = useRevenueCat();
```

The access check is always entitlement-based:

```ts
const isPlus = Boolean(
  customerInfo?.entitlements.active['Tracky Plus'],
);
```

Do not unlock features by checking `monthly`, `yearly`, or `lifetime` directly.
The entitlement is the stable access contract even if products or offerings
change later.

For a custom purchase UI, purchase a package returned by the current offering:

```ts
const { offerings, purchasePackage } = useRevenueCat();
const annual = offerings?.current?.annual;

if (annual) {
  const updatedCustomerInfo = await purchasePackage(annual);
  // null means the customer cancelled. Other errors are thrown to the caller.
}
```

Tracky's primary flow uses the RevenueCat Paywall instead, so pricing, package
selection, purchase progress, cancellation, and restore presentation remain
native and remotely configurable.

## 7. Restore and Customer Center

Settings always exposes **Restore purchases**. This calls
`Purchases.restorePurchases()` and then checks the returned `CustomerInfo` for
`Tracky Plus`.

Configure **RevenueCat > Customer Center** before enabling advanced management
paths. The current integration opens it with:

```ts
await RevenueCatUI.presentCustomerCenter();
```

Customer Center is most useful once real App Store products are live. It gives
active customers a native place to view and manage subscriptions, restore
purchases, request eligible refunds, or follow support flows. Promotional or
retention offers remain optional and require corresponding App Store Connect
offer configuration.

Tracky does not have accounts, so RevenueCat generates an anonymous App User ID.
Purchases remain recoverable through the Apple account and Restore Purchases.
Do not call `logIn()` until Tracky intentionally introduces a real account
system and a stable non-guessable user ID.

## 8. Error handling and testing checklist

The provider treats a customer cancellation as a normal result and throws other
purchase errors to the UI. Settings shows user-facing errors for configuration,
network, paywall, restore, and Customer Center failures.

Test with the RevenueCat Test Store before App Store configuration:

1. Start from a fresh development build and confirm Settings reports `Free`.
2. Open **View plans** and simulate success, cancellation, and failure.
3. Confirm success changes Settings to `Active`.
4. Relaunch the app and confirm `Tracky Plus` remains active.
5. Restore with and without a prior purchase.
6. Exercise Lifetime, Yearly, and Monthly independently.
7. Confirm Customer Center opens and its restore path refreshes Settings.
8. Disable networking and verify Tracky data remains usable while purchase
   actions show a recoverable error.

Before TestFlight:

1. Replace the Test Store key with the iOS `appl_...` public SDK key.
2. Verify all App Store Connect product agreements, tax, banking, localization,
   pricing, and review metadata.
3. Test with an Apple sandbox account or StoreKit testing.
4. Confirm the RevenueCat dashboard shows the correct anonymous customer,
   transaction, product, and active `Tracky Plus` entitlement.
5. Update App Store Connect App Privacy disclosures for purchase history,
   anonymous identifiers, and RevenueCat's limited technical data.
6. Ensure the public privacy policy matches the in-app policy.

## Source documentation

- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat SDK configuration](https://www.revenuecat.com/docs/getting-started/configuring-sdk)
- [CustomerInfo and entitlement status](https://www.revenuecat.com/docs/customers/customer-info)
- [RevenueCat Paywalls](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls)
- [RevenueCat Customer Center for React Native](https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native)
- [RevenueCat Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
