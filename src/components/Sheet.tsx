import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  BottomSheet,
  Group,
  Host,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  ignoreSafeArea,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { BlurView, type BlurTint } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  colorWithAlpha,
  spacing,
  type as typography,
} from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { GlassButton } from './GlassButton';

const HEADER_FADE_STEPS = [
  { fill: 0.84, intensity: 92 },
  { fill: 0.68, intensity: 76 },
  { fill: 0.5, intensity: 60 },
  { fill: 0.32, intensity: 44 },
  { fill: 0.16, intensity: 28 },
  { fill: 0.05, intensity: 12 },
] as const;

export function Sheet({
  cancelIcon,
  cancelLabel = 'Cancel',
  children,
  confirmDisabled = false,
  confirmIcon,
  confirmLabel,
  confirmProminent = false,
  onClose,
  onConfirm,
  size = 'content',
  title,
  visible,
}: PropsWithChildren<{
  cancelIcon?: IconSvgElement;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmIcon?: IconSvgElement;
  confirmLabel?: string;
  confirmProminent?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  size?: 'content' | 'large';
  title: string;
  visible: boolean;
}>) {
  const { theme } = useTracky();
  const { width } = useWindowDimensions();
  const hasActions = Boolean(confirmLabel && onConfirm);
  const headerBlurTint: BlurTint = theme.dark
    ? 'systemUltraThinMaterialDark'
    : 'systemUltraThinMaterialLight';

  return (
    <Host
      colorScheme={theme.scheme}
      ignoreSafeArea={size === 'large' ? 'container' : undefined}
      pointerEvents="box-none"
      seedColor={theme.colors.accent}
      style={styles.host}
    >
      <BottomSheet
        fitToContents={size === 'content'}
        isPresented={visible}
        onIsPresentedChange={(isPresented) => {
          if (!isPresented) onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDragIndicator('hidden'),
            ...(size === 'large'
              ? [
                  presentationDetents(['large']),
                  ignoreSafeArea({ edges: 'bottom', regions: 'container' }),
                ]
              : []),
          ]}
        >
          <RNHostView matchContents={size === 'content'}>
            <View
              style={[
                styles.sheet,
                size === 'large' && styles.largeSheet,
                { width },
              ]}
            >
              <View style={styles.header}>
                <View style={styles.headerBar}>
                  <BlurView
                    intensity={100}
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                    tint={headerBlurTint}
                  />
                  {hasActions ? (
                    <View style={styles.actionHeading}>
                      <GlassButton
                        accessibilityLabel={cancelLabel}
                        compact
                        icon={cancelIcon}
                        label={cancelIcon ? undefined : cancelLabel}
                        onPress={onClose}
                      />
                      <Text
                        accessibilityRole="header"
                        pointerEvents="none"
                        style={[
                          styles.centeredTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {title}
                      </Text>
                      <GlassButton
                        accessibilityLabel={confirmLabel!}
                        compact
                        disabled={confirmDisabled}
                        icon={confirmIcon}
                        label={confirmIcon ? undefined : confirmLabel}
                        onPress={onConfirm!}
                        prominent={confirmProminent}
                      />
                    </View>
                  ) : (
                    <View style={styles.heading}>
                      <Text
                        accessibilityRole="header"
                        style={[
                          typography.section,
                          styles.headingCopy,
                          { color: theme.colors.text },
                        ]}
                      >
                        {title}
                      </Text>
                      <GlassButton
                        accessibilityLabel="Close"
                        compact
                        icon={Cancel01Icon}
                        onPress={onClose}
                      />
                    </View>
                  )}
                </View>
                <View pointerEvents="none" style={styles.headerFade}>
                  {HEADER_FADE_STEPS.map((step) => (
                    <View
                      key={step.intensity}
                      style={[
                        styles.headerFadeStep,
                        {
                          backgroundColor: colorWithAlpha(
                            theme.colors.sheetBackground,
                            step.fill,
                          ),
                        },
                      ]}
                    >
                      <BlurView
                        intensity={step.intensity}
                        style={StyleSheet.absoluteFill}
                        tint={headerBlurTint}
                      />
                    </View>
                  ))}
                </View>
              </View>
              {children}
            </View>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute' },
  sheet: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  largeSheet: { flex: 1, paddingBottom: 0 },
  header: {
    marginBottom: -36,
    position: 'relative',
    zIndex: 1,
  },
  headerBar: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerFade: {
    height: 36,
    marginHorizontal: -spacing.lg,
  },
  headerFadeStep: { flex: 1 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  centeredTitle: {
    fontSize: 17,
    fontWeight: '600',
    left: 0,
    letterSpacing: -0.15,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  headingCopy: { flex: 1, paddingRight: spacing.md },
});
