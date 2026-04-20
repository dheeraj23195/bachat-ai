// src/services/backup.ts

import { getDb } from "./db";
import { listCategories } from "./categories";
import { listBudgets } from "./budgets";
import { listTransactions } from "./transactions";
import {
  BackupPayload,
  Budget,
  Category,
  Transaction,
} from "../lib/types";

/**
 * Export all core app data (categories, budgets, transactions)
 * into a single JSON-friendly payload.
 */
export async function exportAllData(): Promise<BackupPayload> {
  const [categories, budgets, transactions] = await Promise.all([
    listCategories(),
    listBudgets({}),
    listTransactions({}),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    budgets,
    transactions,
  };
}

/**
 * Completely replace local data with the given backup payload.
 *
 * WARNING:
 * - This clears transactions, budgets, categories tables.
 * - It does NOT touch user_settings, alert_rules, ai_training_examples.
 */
export async function importAllData(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported backup version: ${payload.version}`);
  }

  const db = await getDb();

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    // 1. Clear existing rows (order: tx -> budgets -> categories to avoid FK-style issues)
    await db.runAsync("DELETE FROM transactions;");
    await db.runAsync("DELETE FROM budgets;");
    await db.runAsync("DELETE FROM categories;");

    // 2. Restore categories
    for (const cat of payload.categories as Category[]) {
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
        cat.id,
        cat.name,
        cat.icon ?? null,
        cat.colorHex ?? null,
        cat.isDefault ? 1 : 0,
        cat.createdAt,
        cat.updatedAt
      );
    }

    // 3. Restore budgets
    for (const bud of payload.budgets as Budget[]) {
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
        bud.id,
        bud.categoryId ?? null,
        bud.period,
        bud.periodStartDay ?? null,
        bud.limitAmount,
        bud.currency,
        bud.alertThresholdPercent,
        bud.isActive ? 1 : 0,
        bud.createdAt,
        bud.updatedAt
      );
    }

    // 4. Restore transactions
    for (const tx of payload.transactions as Transaction[]) {
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
        tx.id,
        tx.type,
        tx.amount,
        tx.currency,
        tx.date,
        tx.categoryId ?? null,
        tx.paymentMethod,
        tx.encryptedNote ?? null,
        tx.encryptedMerchant ?? null,
        tx.encryptedMetadata ?? null,
        tx.isRecurring ? 1 : 0,
        tx.recurringRule ?? null,
        tx.source,
        tx.createdAt,
        tx.updatedAt
      );
    }

    await db.execAsync("COMMIT;");
  } catch (err) {
    await db.execAsync("ROLLBACK;");
    throw err;
  }
}
