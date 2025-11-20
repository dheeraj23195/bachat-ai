// src/services/cloudSync.ts

import { supabase, getCurrentUser } from "./supabaseClient";
import { getDb, resetDatabase } from "./db";
import { encryptBackupJson, decryptBackupJson } from "../lib/crypto";
import { loadEncryptionSecret } from "../lib/authSecret";
import { EncryptedBackupEnvelope } from "../lib/types";

/**
 * Shape of the full local backup payload.
 * We sync all six tables + schema version.
 */
interface FullBackupPayload {
  version: 1;
  schemaVersion: number;
  transactions: any[];
  categories: any[];
  budgets: any[];
  userSettings: any[];
  alertRules: any[];
  aiTrainingExamples: any[];
}

/* -------------------------------------------------------------------------- */
/*                          DB → JSON (EXPORT)                                */
/* -------------------------------------------------------------------------- */

async function exportLocalDatabaseJson(): Promise<string> {
  const db = await getDb();

  const txRows = await db.getAllAsync<any>("SELECT * FROM transactions;");
  const catRows = await db.getAllAsync<any>("SELECT * FROM categories;");
  const budRows = await db.getAllAsync<any>("SELECT * FROM budgets;");
  const usRows = await db.getAllAsync<any>("SELECT * FROM user_settings;");
  const alertRows = await db.getAllAsync<any>("SELECT * FROM alert_rules;");
  const aiRows = await db.getAllAsync<any>("SELECT * FROM ai_training_examples;");

  const pragmaRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const schemaVersion = pragmaRow?.user_version ?? 0;

  const payload: FullBackupPayload = {
    version: 1,
    schemaVersion,
    transactions: txRows,
    categories: catRows,
    budgets: budRows,
    userSettings: usRows,
    alertRules: alertRows,
    aiTrainingExamples: aiRows,
  };

  return JSON.stringify(payload);
}

/* -------------------------------------------------------------------------- */
/*                          JSON → DB (RESTORE)                               */
/* -------------------------------------------------------------------------- */

async function restoreLocalDatabaseFromJson(json: string): Promise<void> {
  const payload = JSON.parse(json) as FullBackupPayload;

  if (payload.version !== 1) {
    throw new Error(`Unsupported backup version: ${payload.version}`);
  }

  // Drop & recreate schema using your existing migration system
  await resetDatabase();
  const db = await getDb();

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    // categories
    for (const row of payload.categories) {
      await db.runAsync(
        `
          INSERT INTO categories (
            id,
            name,
            icon,
            color_hex,
            is_default,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        row.id,
        row.name,
        row.icon ?? null,
        row.color_hex ?? null,
        row.is_default ?? 0,
        row.created_at,
        row.updated_at
      );
    }

    // budgets
    for (const row of payload.budgets) {
      await db.runAsync(
        `
          INSERT INTO budgets (
            id,
            category_id,
            period,
            period_start_day,
            limit_amount,
            currency,
            alert_threshold_percent,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        row.id,
        row.category_id ?? null,
        row.period,
        row.period_start_day ?? null,
        row.limit_amount,
        row.currency,
        row.alert_threshold_percent,
        row.is_active ?? 1,
        row.created_at,
        row.updated_at
      );
    }

    // transactions
    for (const row of payload.transactions) {
      await db.runAsync(
        `
          INSERT INTO transactions (
            id,
            type,
            amount,
            currency,
            date,
            category_id,
            payment_method,
            encrypted_note,
            encrypted_merchant,
            encrypted_metadata,
            is_recurring,
            recurring_rule,
            source,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        row.id,
        row.type,
        row.amount,
        row.currency,
        row.date,
        row.category_id ?? null,
        row.payment_method,
        row.encrypted_note ?? null,
        row.encrypted_merchant ?? null,
        row.encrypted_metadata ?? null,
        row.is_recurring ?? 0,
        row.recurring_rule ?? null,
        row.source,
        row.created_at,
        row.updated_at
      );
    }

    // user_settings
    for (const row of payload.userSettings) {
      await db.runAsync(
        `
          INSERT INTO user_settings (
            id,
            currency,
            theme,
            pin_enabled,
            biometric_enabled,
            ai_suggestions_enabled,
            budget_alerts_enabled,
            onboarding_completed,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        row.id,
        row.currency,
        row.theme,
        row.pin_enabled ?? 0,
        row.biometric_enabled ?? 0,
        row.ai_suggestions_enabled ?? 1,
        row.budget_alerts_enabled ?? 1,
        row.onboarding_completed ?? 0,
        row.created_at,
        row.updated_at
      );
    }

    // alert_rules
    for (const row of payload.alertRules) {
      await db.runAsync(
        `
          INSERT INTO alert_rules (
            id,
            type,
            budget_id,
            category_id,
            threshold_percent,
            enabled,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        row.id,
        row.type,
        row.budget_id ?? null,
        row.category_id ?? null,
        row.threshold_percent ?? null,
        row.enabled ?? 1,
        row.created_at,
        row.updated_at
      );
    }

    // ai_training_examples
    for (const row of payload.aiTrainingExamples) {
      await db.runAsync(
        `
          INSERT INTO ai_training_examples (
            id,
            transaction_id,
            text,
            category_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?);
        `,
        row.id,
        row.transaction_id,
        row.text,
        row.category_id,
        row.created_at
      );
    }

    await db.execAsync("COMMIT;");
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                         Cloud Backup Helpers                               */
/* -------------------------------------------------------------------------- */

async function getEncryptionSecretOrThrow(): Promise<string> {
  const secret = await loadEncryptionSecret();
  if (!secret) {
    throw new Error("No encryption secret found. Please sign in again.");
  }
  return secret;
}

/**
 * Upload full encrypted backup for the current user.
 * Uses:
 *  - encryption secret from SecureStore
 *  - Supabase table: encrypted_backups(user_id, payload, updated_at)
 */
export async function uploadEncryptedBackup(): Promise<void> {
  const [user, secret] = await Promise.all([
    getCurrentUser(),
    getEncryptionSecretOrThrow(),
  ]);

  if (!user) {
    throw new Error("Not logged in to Supabase.");
  }

  const backupJson = await exportLocalDatabaseJson();
  const envelope: EncryptedBackupEnvelope = await encryptBackupJson(
    backupJson,
    secret
  );
  const envelopeJson = JSON.stringify(envelope);

  const { error } = await supabase
    .from("encrypted_backups")
    .upsert(
      {
        user_id: user.id,
        payload: envelopeJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[CloudSync] uploadEncryptedBackup error", error);
    throw new Error(error.message);
  }
}

/**
 * Download, decrypt, and restore backup for current user.
 */
export async function downloadAndRestoreBackup(): Promise<void> {
  const [user, secret] = await Promise.all([
    getCurrentUser(),
    getEncryptionSecretOrThrow(),
  ]);

  if (!user) {
    throw new Error("Not logged in to Supabase.");
  }

  const { data, error } = await supabase
    .from("encrypted_backups")
    .select("payload")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[CloudSync] downloadAndRestoreBackup select error", error);
    throw new Error(error.message);
  }

  if (!data || !data.payload) {
    throw new Error("No backup found for this account.");
  }

  let envelope: EncryptedBackupEnvelope;
  try {
    envelope = JSON.parse(data.payload);
  } catch (e) {
    console.error("[CloudSync] Failed to parse backup envelope", e);
    throw new Error("Corrupted backup payload.");
  }

  let decryptedJson: string;
  try {
    decryptedJson = await decryptBackupJson(envelope, secret);
  } catch (e) {
    console.error("[CloudSync] Decrypt failed", e);
    throw new Error(
      "Unable to decrypt cloud backup with this secret. " +
        "If you recently reset your password, old encrypted data may no longer be usable."
    );
  }

  await restoreLocalDatabaseFromJson(decryptedJson);
}

/**
 * Wipe cloud backup for current user only.
 */
export async function clearCloudBackup(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not logged in to Supabase.");
  }

  const { error } = await supabase
    .from("encrypted_backups")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[CloudSync] clearCloudBackup error", error);
    throw new Error(error.message);
  }
}

/**
 * Debounced upload helper; call this after any local mutation.
 */
let uploadScheduled = false;

export function queueCloudUpload(delayMs: number = 3000) {
  if (uploadScheduled) return;
  uploadScheduled = true;

  setTimeout(async () => {
    uploadScheduled = false;
    try {
      await uploadEncryptedBackup();
    } catch (e) {
      console.warn("[CloudSync] queued upload failed", e);
    }
  }, delayMs);
}
