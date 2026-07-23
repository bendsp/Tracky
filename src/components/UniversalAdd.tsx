import {
  Activity01Icon,
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  NoteEditIcon,
  StopIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { GlassContainer } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  activityAccents,
  colorWithAlpha,
  radius,
  spacing,
  type as typography,
} from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { EmptyState } from './EmptyState';
import { ChoiceChip, Field, PrimaryButton } from './Form';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';
import { NativeColorPicker } from './NativeControls';
import { Sheet } from './Sheet';

type AddMode = 'activityPicker' | 'newActivity' | 'event' | null;

export function UniversalAdd() {
  const router = useRouter();
  const {
    activities,
    activityTypes,
    createActivityAndSwitch,
    currentActivity,
    logEvent,
    stopCurrentActivity,
    switchActivity,
    theme,
    trackers,
  } = useTracky();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [activityName, setActivityName] = useState('');
  const [activityColor, setActivityColor] = useState<string>(
    activityAccents[0].value,
  );
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(
    trackers[0]?.id ?? null,
  );
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!trackers.some((tracker) => tracker.id === selectedTrackerId)) {
      setSelectedTrackerId(trackers[0]?.id ?? null);
    }
  }, [selectedTrackerId, trackers]);

  const recentActivityTypes = useMemo(() => {
    const lastUsed = new Map<string, number>();
    for (const activity of activities) {
      lastUsed.set(
        activity.activityTypeId,
        Math.max(
          lastUsed.get(activity.activityTypeId) ?? 0,
          new Date(activity.startedAt).getTime(),
        ),
      );
    }
    return [...activityTypes].sort((first, second) => {
      const currentTypeId = currentActivity?.activityTypeId;
      if (first.id === currentTypeId) return -1;
      if (second.id === currentTypeId) return 1;
      return (lastUsed.get(second.id) ?? 0) - (lastUsed.get(first.id) ?? 0);
    });
  }, [activities, activityTypes, currentActivity?.activityTypeId]);

  const openMode = (mode: Exclude<AddMode, null>) => {
    setMenuOpen(false);
    setAddMode(mode);
  };

  const closeActivitySheet = () => {
    setAddMode(null);
    setActivityName('');
    setActivityColor(activityAccents[0].value);
  };

  const switchToActivity = (activityTypeId: string) => {
    switchActivity(activityTypeId);
    closeActivitySheet();
  };

  const submitNewActivity = () => {
    if (!activityName.trim()) return;
    const existing = activityTypes.find(
      (activityType) =>
        activityType.name.toLocaleLowerCase() ===
        activityName.trim().toLocaleLowerCase(),
    );
    if (existing) {
      switchToActivity(existing.id);
      return;
    }
    const createdActivityTypeId = createActivityAndSwitch(
      activityName,
      activityColor,
    );
    if (createdActivityTypeId) closeActivitySheet();
  };

  const submitEvent = () => {
    if (!selectedTrackerId) return;
    const enteredAmount = amount.trim();
    const numericAmount = enteredAmount
      ? Number(enteredAmount.replace(',', '.'))
      : undefined;
    if (enteredAmount && !Number.isFinite(numericAmount)) {
      setAmountError('Enter a valid number or leave the amount blank.');
      return;
    }
    logEvent(selectedTrackerId, numericAmount, note);
    setAmount('');
    setAmountError(null);
    setNote('');
    setAddMode(null);
  };

  return (
    <>
      {menuOpen ? (
        <Pressable
          accessibilityLabel="Close add menu"
          onPress={() => setMenuOpen(false)}
          style={[styles.scrim, { backgroundColor: theme.colors.scrim }]}
        />
      ) : null}

      <GlassContainer spacing={spacing.sm} style={styles.speedDial}>
        {menuOpen ? (
          <View style={styles.speedDialItems}>
            <GlassButton
              accessibilityLabel="Log an event"
              icon={NoteEditIcon}
              label="Log event"
              onPress={() => openMode('event')}
            />
            <GlassButton
              accessibilityLabel="Switch activity"
              icon={Activity01Icon}
              label={currentActivity ? 'Switch activity' : 'Start activity'}
              onPress={() => openMode('activityPicker')}
            />
            {currentActivity ? (
              <GlassButton
                accessibilityLabel="Stop current activity"
                icon={StopIcon}
                label="Stop activity"
                onPress={() => {
                  stopCurrentActivity();
                  setMenuOpen(false);
                }}
              />
            ) : null}
          </View>
        ) : null}
        <GlassButton
          accessibilityLabel={menuOpen ? 'Close add menu' : 'Add'}
          icon={menuOpen ? Cancel01Icon : Add01Icon}
          onPress={() => setMenuOpen((open) => !open)}
          prominent
        />
      </GlassContainer>

      <Sheet
        onClose={closeActivitySheet}
        title={
          addMode === 'newActivity'
            ? 'New activity'
            : currentActivity
              ? 'Switch activity'
              : 'Start activity'
        }
        visible={addMode === 'activityPicker' || addMode === 'newActivity'}
      >
        {addMode === 'newActivity' ? (
          <>
            <Pressable
              accessibilityLabel="Back to previous activities"
              accessibilityRole="button"
              onPress={() => setAddMode('activityPicker')}
              style={styles.backAction}
            >
              <Icon
                color={theme.colors.textSecondary}
                icon={ArrowLeft01Icon}
                size={18}
              />
              <Text
                style={[typography.label, { color: theme.colors.textSecondary }]}
              >
                Previous activities
              </Text>
            </Pressable>
            <Field
              autoCapitalize="sentences"
              autoFocus
              label="Name"
              onChangeText={setActivityName}
              onSubmitEditing={submitNewActivity}
              placeholder="Reading, working, commuting…"
              returnKeyType="done"
              value={activityName}
            />
            <View style={styles.colorField}>
              <Text
                style={[typography.label, { color: theme.colors.textSecondary }]}
              >
                Accent color
              </Text>
              <View style={styles.colorChoices}>
                {activityAccents.map((option) => {
                  const selected = activityColor === option.value;
                  return (
                    <Pressable
                      accessibilityLabel={`${option.label} accent`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => setActivityColor(option.value)}
                      style={[
                        styles.colorChoice,
                        {
                          backgroundColor: option.value,
                          borderColor: selected
                            ? theme.colors.text
                            : 'transparent',
                        },
                      ]}
                    >
                      {selected ? (
                        <Icon
                          color={theme.colors.onAccent}
                          icon={Tick02Icon}
                          size={18}
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <NativeColorPicker
              label="Custom accent color"
              onChange={setActivityColor}
              value={activityColor}
            />
            <PrimaryButton
              disabled={!activityName.trim()}
              label={currentActivity ? 'Create and switch' : 'Create and start'}
              onPress={submitNewActivity}
            />
          </>
        ) : (
          <>
            {recentActivityTypes.length ? (
              <ScrollView
                contentContainerStyle={styles.activityList}
                style={styles.activityListViewport}
              >
                {recentActivityTypes.map((activityType) => {
                  const isCurrent =
                    activityType.id === currentActivity?.activityTypeId;
                  return (
                    <Pressable
                      accessibilityLabel={
                        isCurrent
                          ? `${activityType.name}, current activity`
                          : `Switch to ${activityType.name}`
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: isCurrent,
                        selected: isCurrent,
                      }}
                      disabled={isCurrent}
                      key={activityType.id}
                      onPress={() => switchToActivity(activityType.id)}
                      style={({ pressed }) => [
                        styles.activityOption,
                        {
                          backgroundColor:
                            pressed || isCurrent
                              ? colorWithAlpha(activityType.color, 0.1)
                              : theme.colors.surface,
                          borderColor:
                            pressed || isCurrent
                              ? colorWithAlpha(activityType.color, 0.35)
                              : theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activityColor,
                          { backgroundColor: activityType.color },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          typography.cardTitle,
                          styles.activityOptionLabel,
                          { color: theme.colors.text },
                        ]}
                      >
                        {activityType.name}
                      </Text>
                      {isCurrent ? (
                        <Icon
                          color={activityType.color}
                          icon={Tick02Icon}
                          size={20}
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text
                style={[typography.body, { color: theme.colors.textSecondary }]}
              >
                No previous activities yet.
              </Text>
            )}
            <Pressable
              accessibilityLabel="Create a new activity"
              accessibilityRole="button"
              onPress={() => setAddMode('newActivity')}
              style={({ pressed }) => [
                styles.newActivityOption,
                {
                  backgroundColor: pressed
                    ? theme.colors.accentSoft
                    : theme.colors.surfaceMuted,
                },
              ]}
            >
              <View
                style={[
                  styles.newActivityIcon,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Icon
                  color={theme.colors.onAccent}
                  icon={Add01Icon}
                  size={18}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={[typography.cardTitle, { color: theme.colors.text }]}>
                New activity
              </Text>
            </Pressable>
          </>
        )}
      </Sheet>

      <Sheet
        onClose={() => {
          setAddMode(null);
          setAmountError(null);
        }}
        title="Log an event"
        visible={addMode === 'event'}
      >
        {trackers.length ? (
          <>
            <View style={styles.trackerChoices}>
              {trackers.map((tracker) => (
                <ChoiceChip
                  key={tracker.id}
                  label={tracker.name}
                  onPress={() => setSelectedTrackerId(tracker.id)}
                  selected={selectedTrackerId === tracker.id}
                />
              ))}
            </View>
            <Field
              keyboardType="decimal-pad"
              label="Amount (optional)"
              onChangeText={(value) => {
                setAmount(value);
                setAmountError(null);
              }}
              placeholder={
                trackers.find((tracker) => tracker.id === selectedTrackerId)?.unit ??
                'Number'
              }
              value={amount}
            />
            {amountError ? (
              <Text
                accessibilityRole="alert"
                style={[typography.caption, { color: theme.colors.danger }]}
              >
                {amountError}
              </Text>
            ) : null}
            <Field
              label="Note (optional)"
              multiline
              onChangeText={setNote}
              placeholder="Anything worth remembering"
              value={note}
            />
            <PrimaryButton
              disabled={!selectedTrackerId}
              label="Log now"
              onPress={submitEvent}
            />
          </>
        ) : (
          <>
            <EmptyState icon={NoteEditIcon} title="No trackers yet" />
            <PrimaryButton
              label="Create a tracker"
              onPress={() => {
                setAddMode(null);
                router.navigate('/track');
              }}
            />
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  speedDial: {
    alignItems: 'flex-end',
    bottom: 112,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 21,
  },
  speedDialItems: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackerChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  activityListViewport: { maxHeight: 312 },
  activityList: { gap: spacing.xs },
  activityOption: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  activityColor: {
    borderRadius: radius.pill,
    height: 14,
    width: 14,
  },
  activityOptionLabel: { flex: 1 },
  newActivityOption: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  newActivityIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  backAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
  },
  colorField: { gap: spacing.sm },
  colorChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChoice: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
