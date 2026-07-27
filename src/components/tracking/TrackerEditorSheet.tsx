import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accent, radius, spacing } from '../../design/theme';
import type {
  Tracker,
  TrackerDraft,
} from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { Field } from '../Form';
import { GlassButton } from '../GlassButton';
import { Sheet } from '../Sheet';
import { TrackerIcon } from './TrackerIcon';
import { TrackerIconPickerSheet } from './TrackerIconPickerSheet';

function baseSummary(): TrackerDraft['summary'] {
  return {
    calculation: 'count',
    timeframe: 'today',
    countLabel: 'check-ins',
  };
}

function newDraft(): TrackerDraft {
  return {
    name: '',
    icon: 'star',
    color: accent.primary,
    fields: [],
    summary: baseSummary(),
  };
}

function editableDraft(tracker: Tracker): TrackerDraft {
  return {
    name: tracker.name,
    icon: tracker.icon,
    color: tracker.color,
    fields: tracker.fields.map((field) =>
      field.type === 'choice'
        ? { ...field, choices: [...field.choices] }
        : { ...field },
    ),
    summary: { ...tracker.summary },
  };
}

export function TrackerEditorSheet({
  onClose,
  tracker,
  visible,
}: {
  onClose: () => void;
  tracker?: Tracker | null;
  visible: boolean;
}) {
  const { createTracker, theme, updateTracker } = useTracky();
  const [draft, setDraft] = useState<TrackerDraft>(newDraft);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIconPickerOpen(false);
    setDraft(tracker ? editableDraft(tracker) : newDraft());
  }, [tracker, visible]);

  const save = () => {
    if (!draft.name.trim()) return;
    const simpleDraft: TrackerDraft = tracker
      ? {
          ...draft,
          color: tracker.color,
          fields: tracker.fields,
          summary: tracker.summary,
        }
      : {
          ...draft,
          color: accent.primary,
          fields: [],
          summary: baseSummary(),
        };
    if (tracker) updateTracker(tracker.id, simpleDraft);
    else createTracker(simpleDraft);
    onClose();
  };

  return (
    <Sheet
      confirmDisabled={!draft.name.trim()}
      confirmLabel={tracker ? 'Save' : 'Add'}
      onClose={onClose}
      onConfirm={save}
      size="large"
      title={tracker ? 'Edit Tracker' : 'New Tracker'}
      visible={visible}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.viewport}
      >
        <View style={styles.iconPreviewArea}>
          <Pressable
            accessibilityHint="Opens the icon picker"
            accessibilityLabel="Choose tracker icon"
            accessibilityRole="button"
            onPress={() => setIconPickerOpen(true)}
            style={({ pressed }) => [
              styles.iconPreview,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <TrackerIcon
              color={theme.colors.text}
              name={draft.icon}
              size={50}
            />
          </Pressable>
          <View style={styles.iconMenu}>
            <GlassButton
              accessibilityLabel="Choose tracker icon"
              compact
              icon={MoreHorizontalIcon}
              onPress={() => setIconPickerOpen(true)}
            />
          </View>
        </View>

        <Field
          autoCapitalize="sentences"
          label="Name"
          onChangeText={(name) =>
            setDraft((current) => ({ ...current, name }))
          }
          pill
          placeholder="Read, stretch, call Mum…"
          value={draft.name}
        />
      </ScrollView>
      <TrackerIconPickerSheet
        onClose={() => setIconPickerOpen(false)}
        onSelect={(icon) =>
          setDraft((current) => ({
            ...current,
            icon,
          }))
        }
        selected={draft.icon}
        visible={iconPickerOpen}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  form: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  iconPreviewArea: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 132,
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    width: 132,
  },
  iconPreview: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  iconMenu: {
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
});
