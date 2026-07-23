import {
  DatabaseExportIcon,
  FileImportIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

const APPEARANCE: {
  value: AppearanceMode;
  label: string;
}[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const {
    appearance,
    deleteAll,
    exportSnapshot,
    replaceAllData,
    setAppearance,
    theme,
  } = useTracky();

  const exportData = async () => {
    try {
      const file = new File(
        Paths.cache,
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
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: 'application/json',
      });
      if (result.canceled) return;

      const file = new File(result.assets[0].uri);
      const parsed = parseAndMigrateTrackyData(await file.text());
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
            deleteAll().catch(() => {
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
                0.1.0
              </Text>
            </View>
          </View>
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
}: {
  danger?: boolean;
  icon: typeof Delete02Icon;
  label: string;
  onPress: () => void;
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 150 },
  inner: { paddingHorizontal: spacing.lg },
  group: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
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
});
