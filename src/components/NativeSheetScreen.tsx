import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTracky } from '../store/TrackyProvider';

export function NativeSheetScreen({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>) {
  const { theme } = useTracky();

  return (
    <View
      collapsable={false}
      style={[
        styles.screen,
        { backgroundColor: theme.colors.sheetBackground },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
