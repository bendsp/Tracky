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
  children,
  onClose,
  size = 'content',
  title,
  visible,
}: PropsWithChildren<{
  onClose: () => void;
  size?: 'content' | 'large';
  title: string;
  visible: boolean;
}>) {
  const { theme } = useTracky();
  const { width } = useWindowDimensions();

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
            presentationBackground(theme.colors.backgroundRaised),
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
                  backgroundColor: theme.colors.backgroundRaised,
                  width,
                },
              ]}
            >
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
  headingCopy: { flex: 1, paddingRight: spacing.md },
});
