import {
  Add01Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Delete02Icon,
  HashtagIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  activityAccents,
  colorWithAlpha,
  radius,
  spacing,
  type as typography,
} from '../../design/theme';
import type {
  Tracker,
  TrackerDraft,
  TrackerField,
  TrackerFieldType,
  TrackerIconName,
  TrackerSummaryTimeframe,
} from '../../domain/models';
import {
  createTrackerTemplateDraft,
  type TrackerTemplateId,
} from '../../domain/trackerTemplates';
import { useTracky } from '../../store/TrackyProvider';
import { ChoiceChip, Field, PrimaryButton } from '../Form';
import { Icon } from '../Icon';
import {
  NativeColorPicker,
  NativeMenuPicker,
  NativeSegmentedPicker,
} from '../NativeControls';
import { Sheet } from '../Sheet';
import { TrackerIcon, trackerIconOptions } from './TrackerIcon';
import { TrackerTemplateGateway } from './TrackerTemplateGateway';

type EditorMode = 'gateway' | 'tracker' | 'field';

const fieldTypeOptions = [
  { label: 'Choice', value: 'choice' },
  { label: 'Number', value: 'number' },
  { label: 'Date', value: 'date' },
] as const;

const timeframeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'thisWeek' },
] as const;

function makeFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newDraft(): TrackerDraft {
  return {
    name: '',
    icon: 'star',
    color: activityAccents[0].value,
    fields: [],
    summary: {
      calculation: 'count',
      timeframe: 'today',
      countLabel: 'entries',
    },
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
  const { createTracker, events, theme, updateTracker } = useTracky();
  const [mode, setMode] = useState<EditorMode>(
    tracker ? 'tracker' : 'gateway',
  );
  const [draft, setDraft] = useState<TrackerDraft>(newDraft);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<TrackerFieldType>('choice');
  const [fieldUnit, setFieldUnit] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [choiceName, setChoiceName] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMode(tracker ? 'tracker' : 'gateway');
    setDraft(
      tracker
        ? {
            name: tracker.name,
            icon: tracker.icon,
            color: tracker.color,
            fields: tracker.fields.map((field) =>
              field.type === 'choice'
                ? { ...field, choices: [...field.choices] }
                : { ...field },
            ),
            summary: { ...tracker.summary },
          }
        : newDraft(),
    );
  }, [tracker, visible]);

  const numberFields = useMemo(
    () => draft.fields.filter((field) => field.type === 'number'),
    [draft.fields],
  );

  const resetField = () => {
    setFieldName('');
    setFieldType('choice');
    setFieldUnit('');
    setChoices([]);
    setChoiceName('');
  };

  const close = () => {
    resetField();
    setMode(tracker ? 'tracker' : 'gateway');
    onClose();
  };

  const openCustomDraft = () => {
    resetField();
    setDraft(newDraft());
    setMode('tracker');
  };

  const openTemplateDraft = (templateId: TrackerTemplateId) => {
    resetField();
    setDraft(createTrackerTemplateDraft(templateId));
    setMode('tracker');
  };

  const addChoice = (submittedChoice = choiceName) => {
    const clean = submittedChoice.trim();
    if (
      !clean ||
      choices.some(
        (choice) => choice.toLocaleLowerCase() === clean.toLocaleLowerCase(),
      )
    ) {
      return;
    }
    setChoices((current) => [...current, clean]);
    setChoiceName('');
  };

  const addField = () => {
    const name = fieldName.trim();
    if (!name) return;
    const field: TrackerField =
      fieldType === 'choice'
        ? { id: makeFieldId(), name, type: 'choice', choices }
        : fieldType === 'number'
          ? {
              id: makeFieldId(),
              name,
              type: 'number',
              unit: fieldUnit.trim() || null,
            }
          : { id: makeFieldId(), name, type: 'date' };
    setDraft((current) => ({ ...current, fields: [...current.fields, field] }));
    resetField();
    setMode('tracker');
  };

  const removeField = (fieldId: string) => {
    const hasLoggedValues =
      !!tracker &&
      events.some(
        (event) =>
          event.trackerId === tracker.id &&
          event.values[fieldId] !== undefined &&
          event.values[fieldId] !== null &&
          event.values[fieldId] !== '',
      );
    if (hasLoggedValues) {
      Alert.alert(
        'Field has logged data',
        'This field can’t be removed while existing entries still use it.',
      );
      return;
    }
    setDraft((current) => {
      const fields = current.fields.filter((field) => field.id !== fieldId);
      const summary =
        current.summary.calculation === 'sum' &&
        current.summary.fieldId === fieldId
          ? {
              calculation: 'count' as const,
              timeframe: current.summary.timeframe,
              countLabel: 'entries',
            }
          : current.summary;
      return { ...current, fields, summary };
    });
  };

  const setSummaryCalculation = (calculation: 'count' | 'sum') => {
    setDraft((current) => {
      if (calculation === 'count') {
        return {
          ...current,
          summary: {
            calculation: 'count',
            timeframe: current.summary.timeframe,
            countLabel:
              current.summary.calculation === 'count'
                ? current.summary.countLabel
                : 'entries',
          },
        };
      }
      const firstNumberField = current.fields.find(
        (field) => field.type === 'number',
      );
      if (!firstNumberField) return current;
      return {
        ...current,
        summary: {
          calculation: 'sum',
          timeframe: current.summary.timeframe,
          fieldId: firstNumberField.id,
        },
      };
    });
  };

  const save = () => {
    if (!draft.name.trim()) return;
    if (tracker) updateTracker(tracker.id, draft);
    else createTracker(draft);
    close();
  };

  return (
    <Sheet
      onClose={close}
      size="large"
      title={mode === 'field' ? 'Add field' : tracker ? 'Edit tracker' : 'New Tracker'}
      visible={visible}
    >
      {mode === 'gateway' ? (
        <TrackerTemplateGateway
          onSelectCustom={openCustomDraft}
          onSelectTemplate={openTemplateDraft}
        />
      ) : mode === 'field' ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.form}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.viewport}
        >
          <Pressable
            accessibilityLabel="Back to tracker"
            accessibilityRole="button"
            onPress={() => setMode('tracker')}
            style={styles.back}
          >
            <Icon
              color={theme.colors.textSecondary}
              icon={ArrowLeft01Icon}
              size={18}
            />
            <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
              Tracker
            </Text>
          </Pressable>
          <Field
            autoCapitalize="sentences"
            label="Name"
            onChangeText={setFieldName}
            placeholder="What?"
            value={fieldName}
          />
          <View style={styles.section}>
            <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
              Type
            </Text>
            <NativeSegmentedPicker
              accessibilityLabel="Field type"
              onSelectionChange={setFieldType}
              options={fieldTypeOptions}
              selection={fieldType}
            />
          </View>
          {fieldType === 'number' ? (
            <Field
              autoCapitalize="none"
              label="Unit (optional)"
              onChangeText={setFieldUnit}
              placeholder="ml, km, minutes…"
              value={fieldUnit}
            />
          ) : null}
          {fieldType === 'choice' ? (
            <View style={styles.section}>
              <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
                Choices
              </Text>
              {choices.length ? (
                <View
                  style={[
                    styles.choiceList,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {choices.map((choice, index) => (
                    <View
                      key={`${choice}-${index}`}
                      style={[
                        styles.choiceRow,
                        index > 0 && {
                          borderTopColor: theme.colors.separator,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <Text style={[typography.body, { color: theme.colors.text }]}>
                        {choice}
                      </Text>
                      <Pressable
                        accessibilityLabel={`Remove ${choice}`}
                        hitSlop={10}
                        onPress={() =>
                          setChoices((current) =>
                            current.filter((_, choiceIndex) => choiceIndex !== index),
                          )
                        }
                      >
                        <Icon
                          color={theme.colors.textTertiary}
                          icon={Cancel01Icon}
                          size={18}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.inlineAdd}>
                <View style={styles.inlineField}>
                  <Field
                    autoCapitalize="sentences"
                    label="New choice"
                    onChangeText={setChoiceName}
                    onSubmitEditing={addChoice}
                    placeholder="Water"
                    returnKeyType="done"
                    value={choiceName}
                  />
                </View>
                <Pressable
                  accessibilityLabel="Add choice"
                  accessibilityRole="button"
                  disabled={!choiceName.trim()}
                  onPress={() => addChoice()}
                  style={[
                    styles.inlineButton,
                    {
                      backgroundColor: choiceName.trim()
                        ? theme.colors.accent
                        : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  <Icon
                    color={
                      choiceName.trim()
                        ? theme.colors.onAccent
                        : theme.colors.textTertiary
                    }
                    icon={Add01Icon}
                    size={20}
                  />
                </Pressable>
              </View>
              <Text
                style={[typography.caption, { color: theme.colors.textSecondary }]}
              >
                A new choice can also be added while logging.
              </Text>
            </View>
          ) : null}
          <PrimaryButton
            disabled={!fieldName.trim()}
            label="Add field"
            onPress={addField}
          />
        </ScrollView>
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
                resetField();
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
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Drinking, meditation…"
            value={draft.name}
          />
          <View style={styles.section}>
            <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
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
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        icon: option.value as TrackerIconName,
                      }))
                    }
                    style={[
                      styles.iconChoice,
                      {
                        backgroundColor: selected
                          ? colorWithAlpha(draft.color, 0.16)
                          : theme.colors.surfaceMuted,
                        borderColor: selected ? draft.color : 'transparent',
                      },
                    ]}
                  >
                    <TrackerIcon
                      color={selected ? draft.color : theme.colors.textSecondary}
                      name={option.value}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.section}>
            <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
              Accent color
            </Text>
            <View style={styles.colorGrid}>
              {activityAccents.map((option) => {
                const selected = draft.color === option.value;
                return (
                  <Pressable
                    accessibilityLabel={`${option.label} accent`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        color: option.value,
                      }))
                    }
                    style={[
                      styles.colorChoice,
                      {
                        backgroundColor: option.value,
                        borderColor: selected ? theme.colors.text : 'transparent',
                      },
                    ]}
                  >
                    {selected ? (
                      <Icon
                        color={theme.colors.onAccent}
                        icon={Tick02Icon}
                        size={17}
                        strokeWidth={2.4}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <NativeColorPicker
              label="Custom accent color"
              onChange={(color) =>
                setDraft((current) => ({ ...current, color: color as `#${string}` }))
              }
              value={draft.color}
            />
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={[typography.section, { color: theme.colors.text }]}>
                Fields
              </Text>
              <Pressable
                accessibilityLabel="Add field"
                accessibilityRole="button"
                onPress={() => setMode('field')}
                style={styles.textButton}
              >
                <Icon color={theme.colors.accent} icon={Add01Icon} size={18} />
                <Text style={[typography.label, { color: theme.colors.accent }]}>
                  Add field
                </Text>
              </Pressable>
            </View>
            {draft.fields.length ? (
              <View
                style={[
                  styles.fieldList,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {draft.fields.map((field, index) => (
                  <View
                    key={field.id}
                    style={[
                      styles.fieldRow,
                      index > 0 && {
                        borderTopColor: theme.colors.separator,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Icon
                      color={theme.colors.textSecondary}
                      icon={
                        field.type === 'number'
                          ? HashtagIcon
                          : field.type === 'date'
                            ? Calendar03Icon
                            : Tick02Icon
                      }
                      size={19}
                    />
                    <View style={styles.fieldCopy}>
                      <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
                        {field.name}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {field.type === 'choice'
                          ? `${field.choices.length} ${field.choices.length === 1 ? 'choice' : 'choices'}`
                          : field.type === 'number'
                            ? field.unit || 'Number'
                            : 'Date'}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Remove ${field.name}`}
                      hitSlop={10}
                      onPress={() => removeField(field.id)}
                    >
                      <Icon
                        color={theme.colors.danger}
                        icon={Delete02Icon}
                        size={19}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
                Entries can still be counted without fields.
              </Text>
            )}
          </View>
          <View style={styles.section}>
            <Text style={[typography.section, { color: theme.colors.text }]}>
              Card summary
            </Text>
            <View style={styles.chips}>
              <ChoiceChip
                label="Entry count"
                onPress={() => setSummaryCalculation('count')}
                selected={draft.summary.calculation === 'count'}
              />
              {numberFields.length ? (
                <ChoiceChip
                  label="Number total"
                  onPress={() => setSummaryCalculation('sum')}
                  selected={draft.summary.calculation === 'sum'}
                />
              ) : null}
            </View>
            {draft.summary.calculation === 'count' ? (
              <Field
                autoCapitalize="none"
                label="Count label"
                onChangeText={(countLabel) =>
                  setDraft((current) => ({
                    ...current,
                    summary:
                      current.summary.calculation === 'count'
                        ? { ...current.summary, countLabel }
                        : current.summary,
                  }))
                }
                placeholder="entries, sessions, cups…"
                value={draft.summary.countLabel}
              />
            ) : (
              <NativeMenuPicker
                accessibilityLabel="Number field"
                label="Number field"
                onSelectionChange={(fieldId) =>
                  setDraft((current) => ({
                    ...current,
                    summary: {
                      calculation: 'sum',
                      timeframe: current.summary.timeframe,
                      fieldId,
                    },
                  }))
                }
                options={numberFields.map((field) => ({
                  label: field.name,
                  value: field.id,
                }))}
                selection={draft.summary.fieldId}
              />
            )}
            <NativeSegmentedPicker
              accessibilityLabel="Summary timeframe"
              onSelectionChange={(timeframe: TrackerSummaryTimeframe) =>
                setDraft((current) => ({
                  ...current,
                  summary: { ...current.summary, timeframe },
                }))
              }
              options={timeframeOptions}
              selection={draft.summary.timeframe}
            />
          </View>
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
  viewport: { maxHeight: 640 },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorChoice: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  choiceList: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  choiceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  inlineAdd: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  inlineField: { flex: 1 },
  inlineButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  fieldList: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
  },
  fieldCopy: { flex: 1, gap: spacing.xxs },
  textButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 36,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
