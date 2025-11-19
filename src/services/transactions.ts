// src/services/transactions.ts

import { getDb } from "./db";
import {
  Transaction,
  TransactionFilter,
  TransactionType,
  CurrencyCode,
  PaymentMethod,
} from "../lib/types";

import {
  parseISO,
  isWithinInterval,
  isAfter,
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";


// ---- Input types for creating/updating transactions ----

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  date: string; // ISO
  categoryId?: string | null;
  paymentMethod: PaymentMethod;

  note?: string | null;
  merchant?: string | null;
  metadataJson?: string | null;

  isRecurring?: boolean;
  recurringRule?: string | null;

  source?: Transaction["source"];
}

export interface UpdateTransactionInput {
  amount?: number;
  currency?: CurrencyCode;
  date?: string;
  categoryId?: string | null;
  paymentMethod?: PaymentMethod;

  note?: string | null;
  merchant?: string | null;
  metadataJson?: string | null;

  isRecurring?: boolean;
  recurringRule?: string | null;
}

// ---- Helpers ----

function generateId(prefix: string = "tx"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: row.amount,
    currency: row.currency as CurrencyCode,
    date: row.date,
    categoryId: row.category_id ?? null,
    paymentMethod: row.payment_method as PaymentMethod,
    encryptedNote: row.encrypted_note ?? null,
    encryptedMerchant: row.encrypted_merchant ?? null,
    encryptedMetadata: row.encrypted_metadata ?? null,
    isRecurring: !!row.is_recurring,
    recurringRule: row.recurring_rule ?? null,
    source: row.source as Transaction["source"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Right now we just store note/merchant plain in the encrypted_* columns.
// Later we'll plug in AES-GCM here, without changing the DB schema.
function prepareEncryptedFields(input: {
  note?: string | null;
  merchant?: string | null;
  metadataJson?: string | null;
}) {
  return {
    encryptedNote: input.note ?? null,
    encryptedMerchant: input.merchant ?? null,
    encryptedMetadata: input.metadataJson ?? null,
  };
}

// ---- Public API ----

/**
 * Create and persist a new transaction.
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const { encryptedNote, encryptedMerchant, encryptedMetadata } =
    prepareEncryptedFields(input);

  const isRecurring = input.isRecurring ?? false;
  const recurringRule = input.recurringRule ?? null;
  const source = input.source ?? "manual";

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
    id,
    input.type,
    input.amount,
    input.currency,
    input.date,
    input.categoryId ?? null,
    input.paymentMethod,
    encryptedNote,
    encryptedMerchant,
    encryptedMetadata,
    isRecurring ? 1 : 0,
    recurringRule,
    source,
    now,
    now
  );

  return {
    id,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    categoryId: input.categoryId ?? null,
    paymentMethod: input.paymentMethod,
    encryptedNote,
    encryptedMerchant,
    encryptedMetadata,
    isRecurring,
    recurringRule,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Batch-import many transactions in a single DB transaction.
 * Useful for CSV import, backup restore, etc.
 */
export async function importTransactionsBatch(
  inputs: CreateTransactionInput[]
): Promise<Transaction[]> {
  if (inputs.length === 0) return [];

  const db = await getDb();
  const now = new Date().toISOString();
  const created: Transaction[] = [];

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    for (const input of inputs) {
      const id = generateId();
      const { encryptedNote, encryptedMerchant, encryptedMetadata } =
        prepareEncryptedFields(input);

      const isRecurring = input.isRecurring ?? false;
      const recurringRule = input.recurringRule ?? null;
      const source = input.source ?? "manual";

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
        id,
        input.type,
        input.amount,
        input.currency,
        input.date,
        input.categoryId ?? null,
        input.paymentMethod,
        encryptedNote,
        encryptedMerchant,
        encryptedMetadata,
        isRecurring ? 1 : 0,
        recurringRule,
        source,
        now,
        now
      );

      created.push({
        id,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        date: input.date,
        categoryId: input.categoryId ?? null,
        paymentMethod: input.paymentMethod,
        encryptedNote,
        encryptedMerchant,
        encryptedMetadata,
        isRecurring,
        recurringRule,
        source,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.execAsync("COMMIT;");
    return created;
  } catch (err) {
    await db.execAsync("ROLLBACK;");
    throw err;
  }
}

/**
 * Fetch a single transaction by id.
 */
export async function getTransactionById(
  id: string
): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT * FROM transactions WHERE id = ?;",
    id
  );

  if (!row) return null;
  return mapRowToTransaction(row);
}

/**
 * List transactions with optional filters (date range, categories, type, etc.)
 */
export async function listTransactions(
  filter: TransactionFilter = {}
): Promise<Transaction[]> {
  const db = await getDb();

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (filter.fromDate) {
    whereClauses.push("date >= ?");
    params.push(filter.fromDate);
  }

  if (filter.toDate) {
    whereClauses.push("date <= ?");
    params.push(filter.toDate);
  }

  if (filter.categoryIds && filter.categoryIds.length > 0) {
    const placeholders = filter.categoryIds.map(() => "?").join(", ");
    whereClauses.push(`category_id IN (${placeholders})`);
    params.push(...filter.categoryIds);
  }

  if (filter.types && filter.types.length > 0) {
    const placeholders = filter.types.map(() => "?").join(", ");
    whereClauses.push(`type IN (${placeholders})`);
    params.push(...filter.types);
  }

  if (typeof filter.minAmount === "number") {
    whereClauses.push("amount >= ?");
    params.push(filter.minAmount);
  }

  if (typeof filter.maxAmount === "number") {
    whereClauses.push("amount <= ?");
    params.push(filter.maxAmount);
  }

  if (filter.source && filter.source.length > 0) {
    const placeholders = filter.source.map(() => "?").join(", ");
    whereClauses.push(`source IN (${placeholders})`);
    params.push(...filter.source);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const rows = await db.getAllAsync<any>(
    `
      SELECT * FROM transactions
      ${whereSql}
      ORDER BY date DESC, created_at DESC;
    `,
    params
  );

  return rows.map(mapRowToTransaction);
}

/**
 * Update a transaction partially.
 */
export async function updateTransaction(
  id: string,
  updates: UpdateTransactionInput
): Promise<void> {
  const db = await getDb();

  const fields: string[] = [];
  const params: any[] = [];

  if (typeof updates.amount === "number") {
    fields.push("amount = ?");
    params.push(updates.amount);
  }
  if (updates.currency) {
    fields.push("currency = ?");
    params.push(updates.currency);
  }
  if (updates.date) {
    fields.push("date = ?");
    params.push(updates.date);
  }
  if (updates.categoryId !== undefined) {
    fields.push("category_id = ?");
    params.push(updates.categoryId);
  }
  if (updates.paymentMethod) {
    fields.push("payment_method = ?");
    params.push(updates.paymentMethod);
  }

  const { encryptedNote, encryptedMerchant, encryptedMetadata } =
    prepareEncryptedFields(updates);

  if (updates.note !== undefined) {
    fields.push("encrypted_note = ?");
    params.push(encryptedNote);
  }
  if (updates.merchant !== undefined) {
    fields.push("encrypted_merchant = ?");
    params.push(encryptedMerchant);
  }
  if (updates.metadataJson !== undefined) {
    fields.push("encrypted_metadata = ?");
    params.push(encryptedMetadata);
  }

  if (typeof updates.isRecurring === "boolean") {
    fields.push("is_recurring = ?");
    params.push(updates.isRecurring ? 1 : 0);
  }
  if (updates.recurringRule !== undefined) {
    fields.push("recurring_rule = ?");
    params.push(updates.recurringRule);
  }

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  params.push(now);

  if (fields.length === 0) {
    return;
  }

  params.push(id);

  await db.runAsync(
    `
      UPDATE transactions
      SET ${fields.join(", ")}
      WHERE id = ?;
    `,
    params
  );
}

/**
 * Delete a transaction by id.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?;", id);
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function clampMonthDay(date: Date, targetDay: number): Date {
  // Return a date in the same month as `date` with day = targetDay,
  // clamped to the last valid day of that month if needed.
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const maxDay = monthEnd.getDate();
  const day = Math.min(Math.max(targetDay, 1), maxDay);
  const d = new Date(monthStart);
  d.setDate(day);
  return d;
}

/**
 * Expand recurring transactions into concrete instances for a given date range.
 *
 * - Non-recurring transactions are included only if their original date is in [rangeStart, rangeEnd].
 * - Recurring transactions are expanded according to recurringRule JSON:
 *   {
 *     frequency: "daily" | "weekly" | "monthly",
 *     weekdays?: ["mon","wed",...],   // for weekly
 *     monthDay?: number               // for monthly
 *   }
 * - Each occurrence gets a synthetic id: `${originalId}__${isoDate}`.
 * - Expanded occurrences are returned with isRecurring = false so UI can treat them like normal instances.
 */
export function expandRecurringTransactionsForRange(
  transactions: Transaction[],
  rangeStart: Date,
  rangeEnd: Date
): Transaction[] {
  const result: Transaction[] = [];

  for (const tx of transactions) {
    let txDate: Date;
    try {
      txDate = parseISO(tx.date);
    } catch {
      // Bad date → skip
      continue;
    }

    // Non-recurring: just include if inside range
    if (!tx.isRecurring || !tx.recurringRule) {
      if (isWithinInterval(txDate, { start: rangeStart, end: rangeEnd })) {
        result.push(tx);
      }
      continue;
    }

    // Parse rule JSON
    let rule: any;
    try {
      rule = JSON.parse(tx.recurringRule);
    } catch {
      // Fallback: treat as one-off
      if (isWithinInterval(txDate, { start: rangeStart, end: rangeEnd })) {
        result.push(tx);
      }
      continue;
    }

    const frequency: string = rule.frequency || "monthly";

    // If the first possible occurrence starts after the range, nothing to show
    if (isAfter(txDate, rangeEnd)) {
      continue;
    }

    if (frequency === "daily") {
      // Every day from max(startDate, rangeStart) to rangeEnd
      let cursor = txDate < rangeStart ? rangeStart : txDate;

      while (!isAfter(cursor, rangeEnd)) {
        result.push({
          ...tx,
          id: `${tx.id}__${cursor.toISOString()}`,
          date: cursor.toISOString(),
          isRecurring: true,
        });
        cursor = addDays(cursor, 1);
      }
    } else if (frequency === "weekly") {
      // Weekly: optional weekdays array, otherwise same weekday as original
      const originalWeekday = txDate.getDay();
      const ruleWeekdays: string[] | undefined = rule.weekdays;
      const weekdaySet = new Set<number>(
        (ruleWeekdays && ruleWeekdays.length > 0
          ? ruleWeekdays
          : [Object.keys(WEEKDAY_MAP).find(
              (k) => WEEKDAY_MAP[k] === originalWeekday
            )]
        )
          .filter(Boolean)
          .map((w) => WEEKDAY_MAP[w!.toLowerCase()] ?? originalWeekday)
      );

      // Iterate day-by-day within range (usually 1–2 months, so this is fine)
      let cursor = rangeStart < txDate ? txDate : rangeStart;

      while (!isAfter(cursor, rangeEnd)) {
        if (cursor >= txDate && weekdaySet.has(cursor.getDay())) {
          result.push({
            ...tx,
            id: `${tx.id}__${cursor.toISOString()}`,
            date: cursor.toISOString(),
            isRecurring: true,
          });
        }
        cursor = addDays(cursor, 1);
      }
    } else {
      // Monthly (default): either rule.monthDay or original transaction day
      const baseDay = typeof rule.monthDay === "number"
        ? rule.monthDay
        : txDate.getDate();

      // Start from the month that overlaps the max(rangeStart, txDate)
      let cursor = new Date(txDate);

      // Move cursor forward month-by-month until it's in/after the range
      while (cursor < rangeStart) {
        cursor = addMonths(cursor, 1);
      }

      while (!isAfter(cursor, rangeEnd)) {
        const occurrence = clampMonthDay(cursor, baseDay);

        if (!isAfter(occurrence, rangeEnd) && occurrence >= rangeStart && occurrence >= txDate) {
          result.push({
            ...tx,
            id: `${tx.id}__${occurrence.toISOString()}`,
            date: occurrence.toISOString(),
            isRecurring: true,
          });
        }

        cursor = addMonths(cursor, 1);
      }
    }
  }

  return result;
}

