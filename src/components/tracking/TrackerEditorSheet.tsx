import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
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
import {
  createTrackerTemplateDraft,
  type TrackerTemplateId,
} from '../../domain/trackerTemplates';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic, tapHaptic } from '../../utils/haptics';
import { Field, PrimaryButton } from '../Form';
import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { TrackerIcon, trackerIconOptions } from './TrackerIcon';
import { TrackerTemplateGateway } from './TrackerTemplateGateway';

type EditorMode = 'gateway' | 'tracker';

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
  const [mode, setMode] = useState<EditorMode>(
    tracker ? 'tracker' : 'gateway',
  );
  const [draft, setDraft] = useState<TrackerDraft>(newDraft);

  useEffect(() => {
    if (!visible) return;
    setMode(tracker ? 'tracker' : 'gateway');
    setDraft(tracker ? editableDraft(tracker) : newDraft());
  }, [tracker, visible]);

  const close = () => {
    setMode(tracker ? 'tracker' : 'gateway');
    onClose();
  };

  const openCustomDraft = () => {
    tapHaptic();
    setDraft(newDraft());
    setMode('tracker');
  };

  const openTemplateDraft = (templateId: TrackerTemplateId) => {
    tapHaptic();
    const template = createTrackerTemplateDraft(templateId);
    setDraft({
      ...template,
      color: accent.primary,
      fields: [],
      summary: baseSummary(),
    });
    setMode('tracker');
  };

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
    close();
  };

  return (
    <Sheet
      onClose={close}
      size="large"
      title={tracker ? 'Edit Tracker' : 'New Tracker'}
      visible={visible}
    >
      {mode === 'gateway' ? (
        <TrackerTemplateGateway
          onSelectCustom={openCustomDraft}
          onSelectTemplate={openTemplateDraft}
        />
      ) : (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.form}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.viewport}
        >
          {!tracker ? (
            <Pressable
              accessibilityLabel="Back to tracker examples"
              accessibilityRole="button"
              onPress={() => {
                tapHaptic();
                setMode('gateway');
              }}
              style={styles.back}
            >
              <Icon
                color={theme.colors.textSecondary}
                icon={ArrowLeft01Icon}
                size={18}
              />
              <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
                Examples
              </Text>
            </Pressable>
          ) : null}

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

          <PrimaryButton
            disabled={!draft.name.trim()}
            label={tracker ? 'Save changes' : 'Create tracker'}
            onPress={save}
          />
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
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
