// src/services/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendBudgetAlertNotification(
  title: string,
  body: string
): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null, // fire immediately
  });
}
