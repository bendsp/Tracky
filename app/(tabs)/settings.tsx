import {
  CrownIcon,
  DatabaseExportIcon,
  FileImportIcon,
  Delete02Icon,
  RefreshIcon,
  ShieldUserIcon,
  WalletDone01Icon,
} from '@hugeicons/core-free-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '../../src/components/Icon';
import { NativeSegmentedPicker } from '../../src/components/NativeControls';
import { ScreenHeader, SectionTitle } from '../../src/components/Screen';
import {
  radius,
  spacing,
  type as typography,
  type AppearanceMode,
} from '../../src/design/theme';
import type { TrackyBackupPreview } from '../../src/domain/models';
import {
  createTrackyBackupPreview,
  parseAndMigrateTrackyData,
  TrackyDataError,
  TrackyRollbackError,
} from '../../src/storage/trackyData';
import { useTracky } from '../../src/store/TrackyProvider';
import { useRevenueCat } from '../../src/subscriptions/RevenueCatProvider';
import {
  getPurchaseErrorMessage,
  hasTrackyPlus,
} from '../../src/subscriptions/subscriptionState';

const APPEARANCE: {
  value: AppearanceMode;
  label: string;
}[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const CREATOR_URL = 'https://desprets.net';
const APP_VERSION = Constants.expoConfig?.version ?? '—';
const TRACKY_CACHE_DIRECTORY = new Directory(Paths.cache, 'tracky');
const DOCUMENT_PICKER_CACHE_DIRECTORY = new Directory(
  Paths.cache,
  'DocumentPicker',
);
const LEGACY_TRACKY_CACHE_FILE = /^tracky-(?:backup|export)-.*\.json$/;

function clearTransientTrackyFiles() {
  if (TRACKY_CACHE_DIRECTORY.exists) TRACKY_CACHE_DIRECTORY.delete();
  if (DOCUMENT_PICKER_CACHE_DIRECTORY.exists) {
    DOCUMENT_PICKER_CACHE_DIRECTORY.delete();
  }
  for (const item of Paths.cache.list()) {
    if (LEGACY_TRACKY_CACHE_FILE.test(item.name)) item.delete();
  }
}

function prepareTrackyCache() {
  clearTransientTrackyFiles();
  TRACKY_CACHE_DIRECTORY.create({ idempotent: true, intermediates: true });
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    configurationError,
    isConfigured: purchasesConfigured,
    isLoading: purchasesLoading,
    isPlus,
    presentCustomerCenter,
    presentPaywall,
    restorePurchases,
  } = useRevenueCat();
  const {
    appearance,
    deleteAll,
    exportSnapshot,
    replaceAllData,
    setAppearance,
    theme,
  } = useTracky();

  useEffect(() => {
    try {
      clearTransientTrackyFiles();
    } catch {
      // iOS will eventually purge cache files if an item is temporarily busy.
    }
  }, []);

  const showPlans = async () => {
    try {
      await presentPaywall();
    } catch (error) {
      Alert.alert(
        'Cannot show plans',
        getPurchaseErrorMessage(
          error,
          configurationError ?? 'Tracky Plus plans are unavailable right now.',
        ),
      );
    }
  };

  const manageSubscription = async () => {
    try {
      await presentCustomerCenter();
    } catch (error) {
      Alert.alert(
        'Cannot open subscription management',
        getPurchaseErrorMessage(error),
      );
    }
  };

  const restoreTrackyPlus = async () => {
    try {
      const restoredCustomerInfo = await restorePurchases();
      Alert.alert(
        hasTrackyPlus(restoredCustomerInfo)
          ? 'Tracky Plus restored'
          : 'No purchase found',
        hasTrackyPlus(restoredCustomerInfo)
          ? 'Tracky Plus is active on this device.'
          : 'No Tracky Plus purchase was found for this Apple account.',
      );
    } catch (error) {
      Alert.alert(
        'Restore failed',
        getPurchaseErrorMessage(
          error,
          configurationError ?? 'Tracky could not restore purchases.',
        ),
      );
    }
  };

  const exportData = async () => {
    try {
      prepareTrackyCache();
      const file = new File(
        TRACKY_CACHE_DIRECTORY,
        `tracky-export-${new Date().toISOString().slice(0, 10)}.json`,
      );
      file.create({ overwrite: true });
      file.write(JSON.stringify(exportSnapshot(), null, 2));
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Export Tracky data',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } catch {
      Alert.alert('Export failed', 'Tracky could not create the export file.');
    } finally {
      try {
        clearTransientTrackyFiles();
      } catch {
        Alert.alert(
          'Temporary file remains',
          'iOS could not clear the temporary export. Delete all data will try again.',
        );
      }
    }
  };

  const replaceImportedData = async (replacement: unknown) => {
    try {
      await replaceAllData(replacement);
      Alert.alert('Import complete', 'Tracky replaced the local data on this device.');
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof TrackyRollbackError
          ? error.message
          : 'Tracky kept the data that was already on this device.',
      );
    }
  };

  const importData = async () => {
    try {
      clearTransientTrackyFiles();
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: 'application/json',
      });
      if (result.canceled) return;

      const file = new File(result.assets[0].uri);
      const contents = await file.text();
      const parsed = parseAndMigrateTrackyData(contents);
      const preview = createTrackyBackupPreview(parsed);

      Alert.alert(
        'Replace all current data?',
        formatImportPreview(preview),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace all data',
            style: 'destructive',
            onPress: () => {
              replaceImportedData(parsed.state).catch(() => undefined);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Cannot import this file',
        error instanceof TrackyDataError
          ? error.message
          : 'Choose a valid Tracky JSON backup and try again.',
      );
    } finally {
      try {
        clearTransientTrackyFiles();
      } catch {
        Alert.alert(
          'Temporary file remains',
          'iOS could not clear the imported copy. Delete all data will try again.',
        );
      }
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete all Tracky data?',
      'This permanently removes every activity, tracker, and event stored on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            deleteAll()
              .then(() => {
                try {
                  clearTransientTrackyFiles();
                } catch {
                  Alert.alert(
                    'Data deleted',
                    'Tracky removed its saved data, but iOS could not clear temporary backup files.',
                  );
                }
              })
              .catch(() => {
                Alert.alert('Delete failed', 'Local data could not be removed.');
              });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Settings" />
        <View style={styles.inner}>
          <SectionTitle>Appearance</SectionTitle>
          <NativeSegmentedPicker
            accessibilityLabel="Appearance"
            onSelectionChange={setAppearance}
            options={APPEARANCE}
            selection={appearance}
          />

          <SectionTitle>Tracky Plus</SectionTitle>
          <View
            style={[
              styles.group,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <SettingsRow
              icon={CrownIcon}
              label="Tracky Plus"
              onPress={isPlus ? manageSubscription : showPlans}
              value={
                purchasesLoading
                  ? 'Checking…'
                  : isPlus
                    ? 'Active'
                    : purchasesConfigured
                      ? 'Free'
                      : 'Unavailable'
              }
            />
            <View
              style={[styles.separator, { backgroundColor: theme.colors.separator }]}
            />
            <SettingsRow
              icon={WalletDone01Icon}
              label={isPlus ? 'Manage subscription' : 'View plans'}
              onPress={isPlus ? manageSubscription : showPlans}
            />
            <View
              style={[styles.separator, { backgroundColor: theme.colors.separator }]}
            />
            <SettingsRow
              icon={RefreshIcon}
              label="Restore purchases"
              onPress={restoreTrackyPlus}
            />
          </View>
          {configurationError ? (
            <Text
              style={[
                typography.caption,
                styles.sectionNote,
                { color: theme.colors.textSecondary },
              ]}
            >
              {configurationError}
            </Text>
          ) : null}

          <SectionTitle>Data</SectionTitle>
          <View
            style={[
              styles.group,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <SettingsRow
              icon={DatabaseExportIcon}
              label="Export all data"
              onPress={exportData}
            />
            <View
              style={[styles.separator, { backgroundColor: theme.colors.separator }]}
            />
            <SettingsRow
              icon={FileImportIcon}
              label="Import data"
              onPress={importData}
            />
            <View
              style={[styles.separator, { backgroundColor: theme.colors.separator }]}
            />
            <SettingsRow
              danger
              icon={Delete02Icon}
              label="Delete all data"
              onPress={confirmDeleteAll}
            />
          </View>

          <SectionTitle>About</SectionTitle>
          <View
            style={[
              styles.group,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.row}>
              <Text style={[typography.body, styles.rowLabel, { color: theme.colors.text }]}>
                Version
              </Text>
              <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
                {APP_VERSION}
              </Text>
            </View>
            <View
              style={[styles.separator, { backgroundColor: theme.colors.separator }]}
            />
            <SettingsRow
              icon={ShieldUserIcon}
              label="Privacy policy"
              onPress={() => router.push('/privacy')}
            />
          </View>
          <Pressable
            accessibilityHint="Opens desprets.net in your browser"
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(CREATOR_URL).catch(() => {
                Alert.alert('Cannot open website', 'Please visit desprets.net in your browser.');
              });
            }}
            style={({ pressed }) => [
              styles.creatorLink,
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
              Made with love by Ben Desprets
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function formatImportPreview(preview: TrackyBackupPreview) {
  const lines = [
    preview.exportedAt
      ? `Exported ${new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(preview.exportedAt))}`
      : 'Legacy Tracky data',
    preview.appVersion ? `App version ${preview.appVersion}` : null,
    '',
    `${preview.trackerCount} ${preview.trackerCount === 1 ? 'tracker' : 'trackers'}`,
    `${preview.entryCount} ${preview.entryCount === 1 ? 'entry' : 'entries'}`,
    `${preview.activityCount} ${
      preview.activityCount === 1 ? 'activity' : 'activities'
    }`,
    preview.dateRange
      ? `Dates ${formatDateRange(preview.dateRange.start, preview.dateRange.end)}`
      : 'No dated entries or activities',
    '',
    'This replaces everything currently stored on this device.',
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const startLabel = formatter.format(new Date(start));
  const endLabel = formatter.format(new Date(end));
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function SettingsRow({
  danger = false,
  icon,
  label,
  onPress,
  value,
}: {
  danger?: boolean;
  icon: typeof Delete02Icon;
  label: string;
  onPress: () => void;
  value?: string;
}) {
  const { theme } = useTracky();
  const tint = danger ? theme.colors.danger : theme.colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent' },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? theme.colors.dangerSoft : theme.colors.accentSoft },
        ]}
      >
        <Icon color={tint} icon={icon} size={17} />
      </View>
      <Text
        style={[
          typography.body,
          styles.rowLabel,
          { color: danger ? tint : theme.colors.text },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 150 },
  inner: { paddingHorizontal: spacing.md },
  group: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rowLabel: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  sectionNote: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  creatorLink: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
});
