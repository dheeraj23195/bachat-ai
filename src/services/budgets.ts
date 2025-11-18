// src/services/budgets.ts

import { getDb } from "./db";
import { Budget, BudgetPeriod, CurrencyCode } from "../lib/types";

// ---------- Input types ----------

export interface CreateBudgetInput {
  categoryId?: string | null; // null = overall budget
  period: BudgetPeriod; // 'monthly' | 'weekly' | 'custom'
  periodStartDay?: number | null; // e.g. 1 for "1st of month"
  limitAmount: number;
  currency: CurrencyCode;
  alertThresholdPercent: number; // e.g. 80 for 80%
  isActive?: boolean;
}

export interface UpdateBudgetInput {
  categoryId?: string | null;
  period?: BudgetPeriod;
  periodStartDay?: number | null;
  limitAmount?: number;
  currency?: CurrencyCode;
  alertThresholdPercent?: number;
  isActive?: boolean;
}

export interface BudgetFilter {
  categoryIds?: Array<string | null>; // include null to fetch overall budget
  periods?: BudgetPeriod[];
  activeOnly?: boolean;
}

// ---------- Helpers ----------

function generateBudgetId(prefix: string = "bud"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function mapRowToBudget(row: any): Budget {
  return {
    id: row.id,
    categoryId: row.category_id ?? null,
    period: row.period as BudgetPeriod,
    periodStartDay: row.period_start_day ?? null,
    limitAmount: row.limit_amount,
    currency: row.currency as CurrencyCode,
    alertThresholdPercent: row.alert_threshold_percent,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- Public API ----------

/**
 * Create and persist a new budget row.
 */
export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const db = await getDb();
  const id = generateBudgetId();
  const now = new Date().toISOString();

  const categoryId = input.categoryId ?? null;
  const periodStartDay =
    typeof input.periodStartDay === "number" ? input.periodStartDay : null;
  const isActive = input.isActive ?? true;

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
    id,
    categoryId,
    input.period,
    periodStartDay,
    input.limitAmount,
    input.currency,
    input.alertThresholdPercent,
    isActive ? 1 : 0,
    now,
    now
  );

  return {
    id,
    categoryId,
    period: input.period,
    periodStartDay,
    limitAmount: input.limitAmount,
    currency: input.currency,
    alertThresholdPercent: input.alertThresholdPercent,
    isActive,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Fetch a single budget by id.
 */
export async function getBudgetById(id: string): Promise<Budget | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT * FROM budgets WHERE id = ?;",
    id
  );

  if (!row) return null;
  return mapRowToBudget(row);
}

/**
 * List budgets with optional filters (category, period, activeOnly).
 */
export async function listBudgets(
  filter: BudgetFilter = {}
): Promise<Budget[]> {
  const db = await getDb();

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (filter.categoryIds && filter.categoryIds.length > 0) {
    const nonNullIds = filter.categoryIds.filter((id) => id !== null);
    const hasNull = filter.categoryIds.some((id) => id === null);

    if (nonNullIds.length > 0 && hasNull) {
      const placeholders = nonNullIds.map(() => "?").join(", ");
      whereClauses.push(
        `(category_id IN (${placeholders}) OR category_id IS NULL)`
      );
      params.push(...nonNullIds);
    } else if (nonNullIds.length > 0) {
      const placeholders = nonNullIds.map(() => "?").join(", ");
      whereClauses.push(`category_id IN (${placeholders})`);
      params.push(...nonNullIds);
    } else if (hasNull) {
      whereClauses.push("category_id IS NULL");
    }
  }

  if (filter.periods && filter.periods.length > 0) {
    const placeholders = filter.periods.map(() => "?").join(", ");
    whereClauses.push(`period IN (${placeholders})`);
    params.push(...filter.periods);
  }

  if (filter.activeOnly) {
    whereClauses.push("is_active = 1");
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const rows = await db.getAllAsync<any>(
    `
      SELECT * FROM budgets
      ${whereSql}
      ORDER BY created_at DESC;
    `,
    params
  );

  return rows.map(mapRowToBudget);
}

/**
 * Partially update a budget.
 */
export async function updateBudget(
  id: string,
  updates: UpdateBudgetInput
): Promise<void> {
  const db = await getDb();

  const fields: string[] = [];
  const params: any[] = [];

  if (updates.categoryId !== undefined) {
    fields.push("category_id = ?");
    params.push(updates.categoryId ?? null);
  }

  if (updates.period !== undefined) {
    fields.push("period = ?");
    params.push(updates.period);
  }

  if (updates.periodStartDay !== undefined) {
    fields.push("period_start_day = ?");
    params.push(
      typeof updates.periodStartDay === "number" ? updates.periodStartDay : null
    );
  }

  if (typeof updates.limitAmount === "number") {
    fields.push("limit_amount = ?");
    params.push(updates.limitAmount);
  }

  if (updates.currency !== undefined) {
    fields.push("currency = ?");
    params.push(updates.currency);
  }

  if (typeof updates.alertThresholdPercent === "number") {
    fields.push("alert_threshold_percent = ?");
    params.push(updates.alertThresholdPercent);
  }

  if (typeof updates.isActive === "boolean") {
    fields.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
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
      UPDATE budgets
      SET ${fields.join(", ")}
      WHERE id = ?;
    `,
    params
  );
}

/**
 * Delete a budget permanently.
 */
export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM budgets WHERE id = ?;", id);
}
