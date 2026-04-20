import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const PIN_KEY = "bachat_pin";

async function hashPin(pin: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}

export async function setPin(pin: string) {
  const hashed = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, hashed);
}

export async function verifyPin(pin: string) {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (!stored) return false;
  const hashed = await hashPin(pin);
  return hashed === stored;
}

export async function hasPin() {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY);
}
