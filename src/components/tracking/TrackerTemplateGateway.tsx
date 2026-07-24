import { Add01Icon } from '@hugeicons/core-free-icons';
import {
  Button,
  Form,
  Host,
  HStack,
  Image as NativeImage,
  RNHostView,
  Section,
  Spacer,
  Text as NativeText,
} from '@expo/ui/swift-ui';
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  listRowInsets,
  scrollContentBackground,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { spacing, type as typography } from '../../design/theme';
import {
  trackerTemplateOptions,
  type TrackerTemplateId,
} from '../../domain/trackerTemplates';
import { useTracky } from '../../store/TrackyProvider';
import { Icon } from '../Icon';
import { TrackerIcon } from './TrackerIcon';

export function TrackerTemplateGateway({
  onSelectCustom,
  onSelectTemplate,
}: {
  onSelectCustom: () => void;
  onSelectTemplate: (templateId: TrackerTemplateId) => void;
}) {
  const { theme } = useTracky();
  const { height } = useWindowDimensions();

  return (
    <View
      style={[
        styles.container,
        { height: Math.min(640, Math.max(440, height - 160)) },
      ]}
    >
      <Text style={[typography.body, styles.intro, { color: theme.colors.textSecondary }]}>
        Track anything that matters to you. Start with a simple example, or create
        your own.
      </Text>
      <Host
        colorScheme={theme.scheme}
        seedColor={theme.colors.accent}
        style={styles.formHost}
        useViewportSizeMeasurement
      >
        <Form
          modifiers={[
            scrollContentBackground('hidden'),
          ]}
        >
          <Section title="Start with an example">
            {trackerTemplateOptions.map((template) => (
              <TemplateRow
                accessibilityHint={`Opens an editable ${template.name} tracker`}
                icon={
                  <TrackerIcon
                    color={theme.colors.accent}
                    name={template.icon}
                    size={27}
                  />
                }
                key={template.id}
                label={template.name}
                onPress={() => onSelectTemplate(template.id)}
              />
            ))}
          </Section>
          <Section>
            <TemplateRow
              icon={
                <Icon
                  color={theme.colors.accent}
                  icon={Add01Icon}
                  size={27}
                  strokeWidth={1.9}
                />
              }
              accessibilityHint="Opens a blank tracker editor"
              label="Custom tracker"
              onPress={onSelectCustom}
            />
          </Section>
        </Form>
      </Host>
    </View>
  );
}

function TemplateRow({
  accessibilityHint: hint,
  icon,
  label,
  onPress,
}: {
  accessibilityHint: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTracky();

  return (
    <Button
      modifiers={[
        accessibilityLabel(label),
        accessibilityHint(hint),
        buttonStyle('plain'),
        listRowInsets({
          top: spacing.sm,
          leading: spacing.md,
          bottom: spacing.sm,
          trailing: spacing.md,
        }),
      ]}
      onPress={onPress}
    >
      <HStack
        alignment="center"
        modifiers={[contentShape(shapes.rectangle())]}
        spacing={spacing.md}
      >
        <RNHostView matchContents>
          <View style={styles.icon}>{icon}</View>
        </RNHostView>
        <NativeText
          modifiers={[
            font({ textStyle: 'body', weight: 'regular' }),
            foregroundStyle(theme.colors.text),
          ]}
        >
          {label}
        </NativeText>
        <Spacer />
        <NativeImage
          color={theme.colors.textTertiary}
          size={15}
          systemName="chevron.right"
        />
      </HStack>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  intro: {
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: spacing.xs,
  },
  formHost: {
    flex: 1,
    marginHorizontal: -spacing.lg,
  },
  icon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
