import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  accent,
  radius,
  spacing,
  type as typography,
} from '../../design/theme';
import type {
  Tracker,
  TrackerDraft,
  TrackerIconName,
} from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { Field } from '../Form';
import { Sheet } from '../Sheet';
import { TrackerIcon, trackerIconOptions } from './TrackerIcon';

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

  useEffect(() => {
    if (!visible) return;
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
        <Field
          autoCapitalize="sentences"
          label="Name"
          onChangeText={(name) =>
            setDraft((current) => ({ ...current, name }))
          }
          placeholder="Read, stretch, call Mum…"
          value={draft.name}
        />

        <View style={styles.section}>
          <Text
            style={[typography.label, { color: theme.colors.textSecondary }]}
          >
            Icon
          </Text>
          <View style={styles.iconGrid}>
            {trackerIconOptions.map((option) => {
              const selected = draft.icon === option.value;
              return (
                <Pressable
                  accessibilityLabel={`${option.label} icon`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => {
                    selectionHaptic();
                    setDraft((current) => ({
                      ...current,
                      icon: option.value as TrackerIconName,
                    }));
                  }}
                  style={[
                    styles.iconChoice,
                    {
                      backgroundColor: selected
                        ? theme.colors.accent
                        : theme.colors.surface,
                      borderColor: selected
                        ? theme.colors.accent
                        : theme.colors.border,
                    },
                  ]}
                >
                  <TrackerIcon
                    color={
                      selected
                        ? theme.colors.onAccent
                        : theme.colors.textSecondary
                    }
                    name={option.value}
                    size={21}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text
          style={[
            typography.body,
            styles.helper,
            { color: theme.colors.textSecondary },
          ]}
        >
          Each tracker is a simple daily check-in.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: { gap: spacing.sm },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconChoice: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  helper: { lineHeight: 20 },
});
