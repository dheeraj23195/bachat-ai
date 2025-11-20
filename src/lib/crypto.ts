// src/lib/crypto.ts

import CryptoJS from "crypto-js";
import { EncryptedBackupEnvelope } from "./types";

// We no longer need expo-random or react-native-simple-crypto here.

// -------------------------------------------------------------------
// 🔐 Recovery Key Generator (still usable later if you want UI for it)
// -------------------------------------------------------------------

export function generateRecoveryKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groupLen = 6;
  const groups = 4;

  let out = "";
  for (let g = 0; g < groups; g++) {
    if (g > 0) out += "-";
    for (let i = 0; i < groupLen; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      out += alphabet[idx];
    }
  }
  return out;
}

// -------------------------------------------------------------------
// 🔐 PBKDF2 Key Derivation (crypto-js)
// -------------------------------------------------------------------

export async function deriveSyncKeyFromSecret(
  secret: string,
  saltBytes: Uint8Array | ArrayBuffer
): Promise<CryptoJS.lib.WordArray> {
  const saltWordArray = CryptoJS.lib.WordArray.create(
    saltBytes instanceof Uint8Array
      ? Array.from(saltBytes)
      : Array.from(new Uint8Array(saltBytes as ArrayBuffer))
  );

  const key = CryptoJS.PBKDF2(secret, saltWordArray, {
    keySize: 256 / 32,
    iterations: 100_000,
  });

  return key;
}

// Convenience for random bytes as Uint8Array
function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

// -------------------------------------------------------------------
// 🔐 AES Encrypt Backup JSON (CBC + PKCS7 via crypto-js)
// -------------------------------------------------------------------

export async function encryptBackupJson(
  backupJson: string,
  secret: string
): Promise<EncryptedBackupEnvelope> {
  const salt = randomBytes(16);
  const iv = randomBytes(16); // 16 bytes for AES block size

  const key = await deriveSyncKeyFromSecret(secret, salt);

  const ivWordArray = CryptoJS.lib.WordArray.create(Array.from(iv));
  const encrypted = CryptoJS.AES.encrypt(backupJson, key, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const cipherTextBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const ivBase64 = CryptoJS.enc.Base64.stringify(ivWordArray);
  const saltBase64 = CryptoJS.enc.Base64.stringify(
    CryptoJS.lib.WordArray.create(Array.from(salt))
  );

  return {
    version: 1,
    cipherText: cipherTextBase64,
    iv: ivBase64,
    salt: saltBase64,
  };
}

// -------------------------------------------------------------------
// 🔓 AES Decrypt Backup JSON
// -------------------------------------------------------------------

export async function decryptBackupJson(
  envelope: EncryptedBackupEnvelope,
  secret: string
): Promise<string> {
  if (envelope.version !== 1) {
    throw new Error(`Unsupported encrypted backup version: ${envelope.version}`);
  }

  const saltWordArray = CryptoJS.enc.Base64.parse(envelope.salt);
  const ivWordArray = CryptoJS.enc.Base64.parse(envelope.iv);
  const cipherWordArray = CryptoJS.enc.Base64.parse(envelope.cipherText);

  const key = CryptoJS.PBKDF2(secret, saltWordArray, {
    keySize: 256 / 32,
    iterations: 100_000,
  });

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: cipherWordArray,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const plaintext = CryptoJS.enc.Utf8.stringify(decrypted);
  if (!plaintext) {
    throw new Error("Failed to decrypt backup.");
  }

  return plaintext;
}
