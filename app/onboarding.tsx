import {
  Add01Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../src/components/Icon';
import {
  NativeSheetScreen,
  NativeSheetScrollView,
} from '../src/components/NativeSheetScreen';
import { TrackerIcon } from '../src/components/tracking/TrackerIcon';
import {
  contrastingInk,
  radius,
  resolveHabitColor,
  spacing,
  type as typography,
} from '../src/design/theme';
import {
  describePresetGoal,
  presetDraft,
  trackerPresets,
  type TrackerPreset,
} from '../src/domain/trackerPresets';
import { useOnboarding } from '../src/store/OnboardingProvider';
import { useTrackerEditorSession } from '../src/store/TrackerEditorSession';
import { useTracky } from '../src/store/TrackyProvider';
import { selectionHaptic, successHaptic, tapHaptic } from '../src/utils/haptics';

export default function OnboardingSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trackerEditor = useTrackerEditorSession();
  const { completeOnboarding } = useOnboarding();
  const { createTracker, theme } = useTracky();
  const [selected, setSelected] = useState<string[]>([]);

  // Dismissing by any route — the button, the toolbar, or a swipe — counts as
  // having seen this, so it can't come back on the next launch.
  const markSeen = useRef(completeOnboarding);
  markSeen.current = completeOnboarding;
  useEffect(
    () => () => {
      markSeen.current().catch(() => undefined);
    },
    [],
  );

  const toggle = (preset: TrackerPreset) => {
    selectionHaptic();
    setSelected((current) =>
      current.includes(preset.id)
        ? current.filter((id) => id !== preset.id)
        : [...current, preset.id],
    );
  };

  const start = () => {
    for (const preset of trackerPresets) {
      if (selected.includes(preset.id)) createTracker(presetDraft(preset));
    }
    if (selected.length) successHaptic();
    else tapHaptic();
    router.back();
  };

  const buildMyOwn = () => {
    tapHaptic();
    trackerEditor.begin();
    // Replace rather than push, so the editor's Cancel returns to the app
    // instead of back into onboarding.
    router.replace('/tracker-editor');
  };

  const footerInset = Math.max(insets.bottom, spacing.md);

  return (
    <NativeSheetScreen>
      <Stack.Screen options={{ title: 'Get started' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Skip setup"
          icon="xmark"
          onPress={() => router.back()}
          separateBackground
        />
      </Stack.Toolbar>

      <NativeSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerInset + 52 + spacing.xl },
        ]}
      >
        <View style={styles.intro}>
          {/* Sits under the sheet's "Get started" nav title, so it stays a
              subhead rather than competing as a second H1. */}
          <Text
            accessibilityRole="header"
            style={[typography.title3, { color: theme.colors.text }]}
          >
            What do you want to track?
          </Text>
          <Text
            style={[typography.body, { color: theme.colors.textSecondary }]}
          >
            Pick a few to start. You can rename, retime or remove any of them
            later.
          </Text>
        </View>

        <View
          style={[
            styles.group,
            {
              backgroundColor: theme.colors.groupedSurface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {trackerPresets.map((preset, index) => {
            const isSelected = selected.includes(preset.id);
            const presetColor = resolveHabitColor(preset.color, theme.dark);
            return (
              <Pressable
                accessibilityLabel={`${preset.name}, ${describePresetGoal(preset)}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={preset.id}
                onPress={() => toggle(preset)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && {
                    borderTopColor: theme.colors.separator,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <View
                  style={[
                    styles.presetIcon,
                    {
                      backgroundColor: isSelected
                        ? presetColor
                        : theme.colors.background,
                      borderColor: isSelected
                        ? presetColor
                        : theme.colors.separator,
                    },
                  ]}
                >
                  <TrackerIcon
                    color={
                      isSelected
                        ? contrastingInk(presetColor)
                        : theme.colors.text
                    }
                    name={preset.icon}
                    size={26}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text
                    numberOfLines={1}
                    style={[typography.headline, { color: theme.colors.text }]}
                  >
                    {preset.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.subheadline,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {describePresetGoal(preset)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accent
                        : 'transparent',
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.separator,
                    },
                  ]}
                >
                  {isSelected ? (
                    <Icon
                      color={theme.colors.onAccent}
                      icon={Tick02Icon}
                      size={16}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityHint="Opens the habit editor"
          accessibilityLabel="Create something else"
          accessibilityRole="button"
          onPress={buildMyOwn}
          style={({ pressed }) => [
            styles.group,
            styles.row,
            {
              backgroundColor: pressed
                ? theme.colors.surfaceMuted
                : theme.colors.groupedSurface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Carries a leading tile so its label starts on the same x as the
              preset labels above it. */}
          <View
            style={[
              styles.presetIcon,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.separator,
              },
            ]}
          >
            <Icon color={theme.colors.text} icon={Add01Icon} size={22} />
          </View>
          <Text
            style={[
              typography.body,
              styles.rowCopy,
              { color: theme.colors.text },
            ]}
          >
            Something else…
          </Text>
          <Icon
            color={theme.colors.textTertiary}
            icon={ArrowRight01Icon}
            size={17}
          />
        </Pressable>
      </NativeSheetScrollView>

      <View
        pointerEvents="box-none"
        style={[styles.footer, { paddingBottom: footerInset }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text style={[typography.headline, { color: theme.colors.onAccent }]}>
            {selected.length
              ? `Start tracking (${selected.length})`
              : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    </NativeSheetScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  intro: { gap: spacing.xs },
  group: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  presetIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  rowCopy: { flex: 1, gap: spacing.xxs },
  check: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  footer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  startButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
});
