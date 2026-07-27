import { Cancel01Icon } from '@hugeicons/core-free-icons';
import {
  BottomSheet,
  Group,
  Host,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  ignoreSafeArea,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { spacing, type as typography } from '../design/theme';
import { useTracky } from '../store/TrackyProvider';
import { GlassButton } from './GlassButton';

export function Sheet({
  cancelLabel = 'Cancel',
  children,
  confirmDisabled = false,
  confirmLabel,
  onClose,
  onConfirm,
  size = 'content',
  title,
  visible,
}: PropsWithChildren<{
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
  size?: 'content' | 'large';
  title: string;
  visible: boolean;
}>) {
  const { theme } = useTracky();
  const { width } = useWindowDimensions();
  const hasActions = Boolean(confirmLabel && onConfirm);

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
            presentationBackground(theme.colors.sheetBackground),
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
                {
                  backgroundColor: theme.colors.sheetBackground,
                  width,
                },
              ]}
            >
              {hasActions ? (
                <View style={styles.actionHeading}>
                  <GlassButton
                    accessibilityLabel={cancelLabel}
                    compact
                    label={cancelLabel}
                    onPress={onClose}
                  />
                  <Text
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
                    label={confirmLabel}
                    onPress={onConfirm!}
                  />
                </View>
              ) : (
                <View style={styles.heading}>
                  <Text
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
