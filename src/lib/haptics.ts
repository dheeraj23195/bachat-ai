import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Triggers a light haptic impact (e.g. for button taps or tab switches).
 */
export const hapticLight = () => {
    if (!useSettingsStore.getState().hapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/**
 * Triggers a success notification haptic (e.g. saving an expense, unlocking).
 */
export const hapticSuccess = () => {
    if (!useSettingsStore.getState().hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/**
 * Triggers an error notification haptic (e.g. invalid input, wrong PIN).
 */
export const hapticError = () => {
    if (!useSettingsStore.getState().hapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};
