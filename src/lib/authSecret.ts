// src/lib/authSecret.ts

import * as SecureStore from "expo-secure-store";

/**
 * Save the encryption secret locally.
 * For now, we directly store the password string.
 * This never goes to Supabase; it's only on-device.
 */
export async function saveEncryptionSecret(password: string) {
  await SecureStore.setItemAsync("encryption_secret", password);
}

/**
 * Load the encryption secret (password) from SecureStore.
 */
export async function loadEncryptionSecret(): Promise<string | null> {
  return SecureStore.getItemAsync("encryption_secret");
}

/**
 * Clear the encryption secret (on logout, etc.).
 */
export async function clearEncryptionSecret() {
  await SecureStore.deleteItemAsync("encryption_secret");
}
