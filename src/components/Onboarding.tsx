import {
  Add01Icon,
  AddToListIcon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useRef, useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  habitColors,
  radius,
  spacing,
  type as typography,
} from '../design/theme';
import { useOnboarding } from '../store/OnboardingProvider';
import { useTracky } from '../store/TrackyProvider';
import { selectionHaptic, successHaptic } from '../utils/haptics';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';
import {
  RING_SIZE,
  ringIconSize,
} from './tracking/progressRing';
import { TrackerProgressRing } from './tracking/TrackerProgressRing';

const PAGE_COUNT = 3;
const EXAMPLE_COLOR = habitColors[7].value;

export function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [completing, setCompleting] = useState(false);
  const [page, setPage] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const { theme } = useTracky();

  const goToPage = (nextPage: number) => {
    const boundedPage = Math.max(0, Math.min(PAGE_COUNT - 1, nextPage));
    if (boundedPage === page) return;
    selectionHaptic();
    pager.current?.scrollTo({ animated: true, x: width * boundedPage });
    setPage(boundedPage);
  };

  const continueForward = async () => {
    if (page < PAGE_COUNT - 1) {
      goToPage(page + 1);
      return;
    }
    setCompleting(true);
    try {
      await completeOnboarding();
      successHaptic();
    } catch {
      Alert.alert(
        'Couldn’t finish setup',
        'Tracky could not save this preference. Please try again.',
      );
      setCompleting(false);
    }
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextPage !== page) {
      selectionHaptic();
      setPage(nextPage);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <ScrollView
        accessibilityLabel="Tracky introduction"
        bounces={false}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        ref={pager}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      >
        <OnboardingPage
          active={page === 0}
          body="A quiet place for the things you want to keep doing."
          title="Remember what matters"
          width={width}
        >
          <View
            style={[
              styles.brandMark,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon
              color={theme.colors.text}
              icon={AddToListIcon}
              size={54}
              strokeWidth={1.8}
            />
          </View>
          <Text style={[typography.largeTitle, { color: theme.colors.text }]}>
            Tracky
          </Text>
        </OnboardingPage>

        <OnboardingPage
          active={page === 1}
          body="Give it a name and choose how often you want to do it."
          title="Create a tracker"
          width={width}
        >
          <View
            style={[
              styles.editorCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.editorIcon,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Icon
                color={theme.colors.text}
                icon={BookOpen01Icon}
                size={32}
              />
            </View>
            <View style={styles.editorCopy}>
              <Text style={[typography.footnote, { color: theme.colors.textSecondary }]}>
                Name
              </Text>
              <View
                style={[
                  styles.editorField,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[typography.body, { color: theme.colors.text }]}>
                  Read
                </Text>
              </View>
              <Text style={[typography.footnote, { color: theme.colors.textSecondary }]}>
                Goal
              </Text>
              <View
                style={[
                  styles.goalRow,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[typography.body, { color: theme.colors.text }]}>
                  1 time every day
                </Text>
              </View>
            </View>
          </View>
        </OnboardingPage>

        <OnboardingPage
          active={page === 2}
          body="Tap the plus when you do it. Tracky keeps the history."
          title="Check in and move on"
          width={width}
        >
          <View
            style={[
              styles.trackerCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TrackerProgressRing
              color={EXAMPLE_COLOR}
              count={1}
              size={RING_SIZE.row}
              target={1}
              trackColor={theme.colors.separator}
            >
              <Icon
                color={theme.colors.text}
                icon={BookOpen01Icon}
                size={ringIconSize(RING_SIZE.row)}
              />
            </TrackerProgressRing>
            <View style={styles.trackerCopy}>
              <Text style={[typography.headline, { color: theme.colors.text }]}>
                Read
              </Text>
              <Text
                style={[
                  typography.subheadline,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Done today
              </Text>
            </View>
            <View
              style={[
                styles.checkButton,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <Icon
                color={theme.colors.onAccent}
                icon={Tick02Icon}
                size={22}
              />
            </View>
          </View>
          <View style={styles.quickHint}>
            <View
              style={[
                styles.plusHint,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Icon color={theme.colors.text} icon={Add01Icon} size={22} />
            </View>
            <Text
              style={[
                typography.subheadline,
                { color: theme.colors.textSecondary },
              ]}
            >
              One tap is all it takes
            </Text>
          </View>
        </OnboardingPage>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View accessibilityLabel={`Page ${page + 1} of ${PAGE_COUNT}`} style={styles.dots}>
          {Array.from({ length: PAGE_COUNT }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === page
                      ? theme.colors.text
                      : theme.colors.separator,
                },
                index === page ? styles.activeDot : null,
              ]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          {page > 0 ? (
            <GlassButton
              accessibilityLabel="Back"
              compact
              icon={ArrowLeft01Icon}
              onPress={() => goToPage(page - 1)}
            />
          ) : null}
          <View style={styles.continueButton}>
            <GlassButton
              accessibilityLabel={
                page === PAGE_COUNT - 1
                  ? 'Start using Tracky'
                  : 'Continue'
              }
              disabled={completing}
              fullWidth
              label={
                completing
                  ? 'Starting…'
                  : page === PAGE_COUNT - 1
                  ? 'Start tracking'
                  : 'Continue'
              }
              onPress={() => {
                continueForward().catch(() => undefined);
              }}
              prominent
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function OnboardingPage({
  active,
  body,
  children,
  title,
  width,
}: {
  active: boolean;
  body: string;
  children: React.ReactNode;
  title: string;
  width: number;
}) {
  const { theme } = useTracky();
  return (
    <View
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      style={[styles.page, { width }]}
    >
      <View style={styles.illustration}>{children}</View>
      <View style={styles.pageCopy}>
        <Text
          accessibilityRole="header"
          style={[typography.title, styles.title, { color: theme.colors.text }]}
        >
          {title}
        </Text>
        <Text
          style={[
            typography.body,
            styles.body,
            { color: theme.colors.textSecondary },
          ]}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    maxHeight: 430,
    minHeight: 300,
  },
  brandMark: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  pageCopy: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  title: { textAlign: 'center' },
  body: { maxWidth: 330, textAlign: 'center' },
  editorCard: {
    alignItems: 'flex-start',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
  },
  editorIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  editorCopy: { flex: 1, gap: spacing.xs },
  editorField: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  goalRow: {
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  trackerCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: 360,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  trackerCopy: { flex: 1, gap: spacing.xxs },
  checkButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  plusHint: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  footer: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  dots: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    height: 8,
  },
  dot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  activeDot: { width: 18 },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  continueButton: { flex: 1 },
});
