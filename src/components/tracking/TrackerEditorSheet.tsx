import {
  PencilEdit02Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  defaultHabitColor,
  habitColors,
  normalizeHabitColor,
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../../design/theme';
import type {
  Tracker,
  TrackerDraft,
} from '../../domain/models';
import { useTracky } from '../../store/TrackyProvider';
import { selectionHaptic } from '../../utils/haptics';
import { Field } from '../Form';
import { GlassButton } from '../GlassButton';
import { Icon } from '../Icon';
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
    color: defaultHabitColor,
    fields: [],
    summary: baseSummary(),
  };
}

function editableDraft(tracker: Tracker): TrackerDraft {
  return {
    name: tracker.name,
    icon: tracker.icon,
    color: normalizeHabitColor(tracker.color),
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
          fields: tracker.fields,
          summary: tracker.summary,
        }
      : {
          ...draft,
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
              icon={PencilEdit02Icon}
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

        <View style={styles.colorField}>
          <Text style={[typography.eyebrow, { color: theme.colors.textSecondary }]}>
            Color
          </Text>
          <View style={styles.colorGrid}>
            {habitColors.map((option) => {
              const selected = draft.color === option.value;
              const swatchColor = resolveHabitColor(option.value, theme.dark);
              return (
                <Pressable
                  accessibilityLabel={`${option.label} habit color`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => {
                    selectionHaptic();
                    setDraft((current) => ({
                      ...current,
                      color: option.value,
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.colorChoice,
                    {
                      backgroundColor: swatchColor,
                      borderColor: selected
                        ? theme.colors.text
                        : 'transparent',
                      opacity: pressed ? 0.68 : 1,
                    },
                  ]}
                >
                  {selected ? (
                    <Icon
                      color={swatchForeground(swatchColor)}
                      icon={Tick02Icon}
                      size={22}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
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

function swatchForeground(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.64 ? '#0A0A0A' : '#FFFFFF';
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
  colorField: { gap: spacing.sm },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChoice: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
