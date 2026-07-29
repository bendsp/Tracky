import { Add01Icon, Delete02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type as typography } from '../../design/theme';
import type {
  TrackedEvent,
  Tracker,
  TrackerEntryDraft,
  TrackerEntryValue,
} from '../../domain/models';
import { localDateKey } from '../../domain/tracking';
import { useTracky } from '../../store/TrackyProvider';
import { ChoiceChip, Field, PrimaryButton } from '../Form';
import { Icon } from '../Icon';
import { NativeDatePicker, NativeTimePicker } from '../NativeControls';

function initialValues(tracker: Tracker, event?: TrackedEvent | null) {
  const today = localDateKey(new Date());
  return Object.fromEntries(
    tracker.fields.map((field) => {
      const value = event?.values[field.id];
      return [
        field.id,
        field.type === 'number' && typeof value === 'number'
          ? String(value)
          : (value ?? (field.type === 'date' && !event ? today : '')),
      ];
    }),
  ) as Record<string, string>;
}

export function TrackerEntryForm({
  event,
  onDelete,
  onSubmit,
  submitLabel,
  tracker,
}: {
  event?: TrackedEvent | null;
  onDelete?: () => void;
  onSubmit: (draft: TrackerEntryDraft) => void;
  submitLabel: string;
  tracker: Tracker;
}) {
  const { addTrackerChoice, theme } = useTracky();
  const [occurredAt, setOccurredAt] = useState(
    event ? new Date(event.occurredAt) : new Date(),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(tracker, event),
  );
  const [note, setNote] = useState(event?.note ?? '');
  const [newChoices, setNewChoices] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setOccurredAt(event ? new Date(event.occurredAt) : new Date());
    setValues(initialValues(tracker, event));
    setNote(event?.note ?? '');
    setNewChoices({});
    setErrors({});
  }, [event, tracker.id]);

  const validOccurrence = Number.isFinite(occurredAt.getTime());
  const numberErrors = useMemo(
    () =>
      tracker.fields.flatMap((field) => {
        if (field.type !== 'number') return [];
        const value = values[field.id]?.trim();
        return value && !Number.isFinite(Number(value.replace(',', '.')))
          ? [field.id]
          : [];
      }),
    [tracker.fields, values],
  );

  const setOccurrenceDate = (date: Date) => {
    const combined = new Date(occurredAt);
    combined.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setOccurredAt(combined);
  };

  const setOccurrenceTime = (time: Date) => {
    const combined = new Date(occurredAt);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    setOccurredAt(combined);
  };

  const useNewChoice = (fieldId: string, submittedChoice?: string) => {
    const clean = (submittedChoice ?? newChoices[fieldId])?.trim();
    if (!clean) return;
    const field = tracker.fields.find(
      (candidate) => candidate.id === fieldId && candidate.type === 'choice',
    );
    const canonicalChoice =
      field?.type === 'choice'
        ? (field.choices.find(
            (choice) =>
              choice.toLocaleLowerCase() === clean.toLocaleLowerCase(),
          ) ?? clean)
        : clean;
    addTrackerChoice(tracker.id, fieldId, canonicalChoice);
    setValues((current) => ({ ...current, [fieldId]: canonicalChoice }));
    setNewChoices((current) => ({ ...current, [fieldId]: '' }));
  };

  const submit = () => {
    if (!validOccurrence || numberErrors.length) {
      setErrors(
        Object.fromEntries(
          numberErrors.map((fieldId) => [fieldId, 'Enter a valid number.']),
        ),
      );
      return;
    }
    const parsedValues = Object.fromEntries(
      tracker.fields.flatMap<[string, TrackerEntryValue]>((field) => {
        const raw = values[field.id]?.trim();
        if (!raw) return [];
        if (field.type === 'number') {
          return [[field.id, Number(raw.replace(',', '.'))]];
        }
        return [[field.id, raw]];
      }),
    );
    onSubmit({
      occurredAt: occurredAt.toISOString(),
      values: parsedValues,
      note: note.trim() || null,
    });
  };

  return (
    <View style={styles.form}>
      {tracker.fields.map((field) => (
        <View key={field.id} style={styles.fieldGroup}>
          {field.type === 'choice' ? (
            <>
              <Text style={[typography.footnote, { color: theme.colors.textSecondary }]}>
                {field.name}
              </Text>
              <View style={styles.chips}>
                {field.choices.map((choice) => (
                  <ChoiceChip
                    key={choice}
                    label={choice}
                    onPress={() =>
                      setValues((current) => ({ ...current, [field.id]: choice }))
                    }
                    selected={values[field.id] === choice}
                  />
                ))}
              </View>
              <View style={styles.inlineAdd}>
                <View style={styles.inlineField}>
                  <Field
                    autoCapitalize="sentences"
                    label="New choice"
                    onChangeText={(choice) =>
                      setNewChoices((current) => ({
                        ...current,
                        [field.id]: choice,
                      }))
                    }
                    onSubmitEditing={(choice) => useNewChoice(field.id, choice)}
                    placeholder="Add another option"
                    returnKeyType="done"
                    value={newChoices[field.id] ?? ''}
                  />
                </View>
                <Pressable
                  accessibilityLabel={`Add choice to ${field.name}`}
                  accessibilityRole="button"
                  disabled={!newChoices[field.id]?.trim()}
                  onPress={() => useNewChoice(field.id)}
                  style={[
                    styles.inlineButton,
                    {
                      backgroundColor: newChoices[field.id]?.trim()
                        ? theme.colors.accent
                        : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  <Icon
                    color={
                      newChoices[field.id]?.trim()
                        ? theme.colors.onAccent
                        : theme.colors.textTertiary
                    }
                    icon={Add01Icon}
                    size={20}
                  />
                </Pressable>
              </View>
            </>
          ) : null}
          {field.type === 'number' ? (
            <>
              <Field
                keyboardType="decimal-pad"
                label={`${field.name}${field.unit ? ` (${field.unit})` : ''}`}
                onChangeText={(value) => {
                  setValues((current) => ({ ...current, [field.id]: value }));
                  setErrors((current) => ({ ...current, [field.id]: '' }));
                }}
                placeholder="0"
                value={values[field.id] ?? ''}
              />
              {errors[field.id] ? (
                <Text style={[typography.footnote, { color: theme.colors.danger }]}>
                  {errors[field.id]}
                </Text>
              ) : null}
            </>
          ) : null}
          {field.type === 'date' ? (
            <View style={styles.nativePickerRow}>
              <Text style={[typography.footnote, { color: theme.colors.textSecondary }]}>
                {field.name}
              </Text>
              <NativeDatePicker
                label={field.name}
                onChange={(date) =>
                  setValues((current) => ({
                    ...current,
                    [field.id]: localDateKey(date),
                  }))
                }
                value={
                  values[field.id]
                    ? new Date(`${values[field.id]}T12:00:00`)
                    : new Date()
                }
              />
            </View>
          ) : null}
        </View>
      ))}
      <View
        style={[
          styles.occurrence,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[typography.headline, { color: theme.colors.text }]}>
          Occurred
        </Text>
        <NativeDatePicker
          label="Occurrence date"
          onChange={setOccurrenceDate}
          value={occurredAt}
        />
        <NativeTimePicker
          label="Occurrence time"
          onChange={setOccurrenceTime}
          value={occurredAt}
        />
      </View>
      <Field
        label="Note (optional)"
        multiline
        onChangeText={setNote}
        placeholder="Anything worth remembering"
        value={note}
      />
      <PrimaryButton
        disabled={!validOccurrence}
        label={submitLabel}
        onPress={submit}
      />
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={[styles.delete, { backgroundColor: theme.colors.dangerSoft }]}
        >
          <Icon color={theme.colors.danger} icon={Delete02Icon} size={19} />
          <Text style={[typography.footnote, { color: theme.colors.danger }]}>
            Delete entry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  inlineAdd: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  inlineField: { flex: 1 },
  inlineButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  occurrence: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  nativePickerRow: { gap: spacing.xs },
  delete: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 50,
  },
});
