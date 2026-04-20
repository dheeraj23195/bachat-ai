import * as LocalAuthentication from "expo-local-authentication";
import { getDb } from "../services/db";

export async function isBiometricSupported(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to unlock Bachat AI",
      fallbackLabel: "Use PIN",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    return result.success === true;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE user_settings SET biometric_enabled = ? WHERE id = ?;",
    enabled ? 1 : 0,
    "default" // your user_settings PK
  );
}

export async function getBiometricEnabled(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ biometric_enabled: number }>(
    "SELECT biometric_enabled FROM user_settings WHERE id = ?;",
    "default"
  );

  return row?.biometric_enabled === 1;
}
