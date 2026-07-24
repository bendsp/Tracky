import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { spacing, type as typography } from '../src/design/theme';
import { useTracky } from '../src/store/TrackyProvider';

export default function PrivacyScreen() {
  const { theme } = useTracky();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerBackButtonDisplayMode: 'minimal',
          headerBlurEffect:
            Platform.OS === 'ios' &&
            Number.parseInt(String(Platform.Version), 10) < 26
              ? 'systemChromeMaterial'
              : undefined,
          headerShadowVisible: false,
          headerShown: true,
          headerStyle:
            Platform.OS === 'ios'
              ? { backgroundColor: 'transparent' }
              : { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.text },
          headerTransparent: Platform.OS === 'ios',
          title: 'Privacy',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PolicySection title="Your data stays yours">
          Tracky stores your activity timeline, trackers, entries, optional notes,
          and appearance preference in the app’s local storage on this device. It
          does not require an account and does not send or sync that data to Ben
          Desprets or any third party.
        </PolicySection>

        <PolicySection title="No tracking">
          Tracky contains no advertising, behavioral analytics, or background
          surveillance. It does not request access to Health, Location, Photos,
          Contacts, or other protected personal-data permissions.
        </PolicySection>

        <PolicySection title="Export and import">
          Your data leaves Tracky only when you choose Export all data and select a
          destination in the iOS share sheet. Import data reads only the Tracky JSON
          backup you select. The source file remains untouched, and Tracky removes
          its temporary import or export copy after the operation.
        </PolicySection>

        <PolicySection title="Retention and deletion">
          Data remains on this device until you edit or delete it, choose Delete
          all data, or remove the app. Delete all data removes Tracky’s saved
          activities, trackers, entries, and temporary backup files.
          Apple device backups, if enabled by you, are controlled through your
          Apple account and device settings.
        </PolicySection>

        <PolicySection title="Website">
          The creator link opens desprets.net in your browser. Tracky does not
          receive information about your visit.
        </PolicySection>

        <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
          Last updated July 24, 2026
        </Text>
      </ScrollView>
    </View>
  );
}

function PolicySection({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  const { theme } = useTracky();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[typography.section, { color: theme.colors.text }]}
      >
        {title}
      </Text>
      <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: { gap: spacing.sm },
});
