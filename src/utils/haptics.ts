import * as Haptics from 'expo-haptics';

function quietly(feedback: Promise<void>) {
  feedback.catch(() => undefined);
}

export function tapHaptic() {
  quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function selectionHaptic() {
  quietly(Haptics.selectionAsync());
}

export function successHaptic() {
  quietly(
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function warningHaptic() {
  quietly(
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}
