// src/services/categories.ts

import { getDb } from "./db";
import { Category, CategoryUsage } from "../lib/types";
import { queueCloudUpload } from "./cloudSync"; // ← ADDED

// ---------- Default categories ----------

const DEFAULT_CATEGORIES = [
  { id: "food", name: "Food & Dining", icon: "utensils", colorHex: "#F97316" },
  { id: "transport", name: "Transport", icon: "car", colorHex: "#6366F1" },
  {
    id: "shopping",
    name: "Shopping",
    icon: "shopping-bag",
    colorHex: "#EC4899",
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: "repeat",
    colorHex: "#A855F7",
  },
  { id: "bills", name: "Bills & Utilities", icon: "bill", colorHex: "#22C55E" },
  { id: "other", name: "Other", icon: "dots-horizontal", colorHex: "#6B7280" },
];

// ---------- Helpers ----------

function mapRowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? null,
    colorHex: row.color_hex ?? null,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateCategoryId(prefix: string = "cat"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Public API ----------

export async function ensureDefaultCategories(): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `
        INSERT OR IGNORE INTO categories (
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
      1,
      now,
      now
    );
  }
}

export async function createCategory(input: {
  id?: string;
  name: string;
  icon?: string | null;
  colorHex?: string | null;
  isDefault?: boolean;
}): Promise<Category> {
  const db = await getDb();
  const now = new Date().toISOString();

  const nameTrimmed = input.name.trim();
  let id =
    input.id ??
    (slugifyName(nameTrimmed) || generateCategoryId());

  const isDefault = input.isDefault ?? false;

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
    id,
    nameTrimmed,
    input.icon ?? null,
    input.colorHex ?? null,
    isDefault ? 1 : 0,
    now,
    now
  );

  await queueCloudUpload(); // ← ADDED

  return {
    id,
    name: nameTrimmed,
    icon: input.icon ?? null,
    colorHex: input.colorHex ?? null,
    isDefault,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT * FROM categories WHERE id = ?;",
    id
  );
  if (!row) return null;
  return mapRowToCategory(row);
}

export async function findCategoryByName(name: string): Promise<Category | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `
      SELECT * FROM categories
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1;
    `,
    name.trim()
  );
  if (!row) return null;
  return mapRowToCategory(row);
}

export async function ensureCategoryByName(
  name: string,
  colorHex: string
): Promise<Category> {
  const existing = await findCategoryByName(name);
  if (existing) {
    if (!existing.colorHex && colorHex) {
      await updateCategory(existing.id, { colorHex });
      return { ...existing, colorHex };
    }
    return existing;
  }

  return createCategory({
    name,
    isDefault: false,
    colorHex,
    icon: null,
  });
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `
      SELECT * FROM categories
      ORDER BY name COLLATE NOCASE ASC;
    `
  );
  return rows.map(mapRowToCategory);
}

export async function getCategoryUsage(
  categoryId: string
): Promise<CategoryUsage> {
  const db = await getDb();

  const txRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;`,
    categoryId
  );

  const budRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM budgets WHERE category_id = ?;`,
    categoryId
  );

  return {
    transactionCount: txRow?.count ?? 0,
    budgetCount: budRow?.count ?? 0,
  };
}

export class CategoryInUseError extends Error {
  transactionCount: number;
  budgetCount: number;

  constructor(transactionCount: number, budgetCount: number) {
    super("CATEGORY_IN_USE");
    this.transactionCount = transactionCount;
    this.budgetCount = budgetCount;
  }
}

export async function updateCategory(
  id: string,
  updates: { name?: string; icon?: string | null; colorHex?: string | null }
): Promise<void> {
  const db = await getDb();

  const fields: string[] = [];
  const params: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    params.push(updates.name.trim());
  }

  if (updates.icon !== undefined) {
    fields.push("icon = ?");
    params.push(updates.icon);
  }

  if (updates.colorHex !== undefined) {
    fields.push("color_hex = ?");
    params.push(updates.colorHex);
  }

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  params.push(now);

  params.push(id);

  await db.runAsync(
    `
      UPDATE categories
      SET ${fields.join(", ")}
      WHERE id = ?;
    `,
    params
  );

  await queueCloudUpload(); // ← ADDED
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();

  const { transactionCount, budgetCount } = await getCategoryUsage(id);

  if (transactionCount > 0 || budgetCount > 0) {
    throw new CategoryInUseError(transactionCount, budgetCount);
  }

  await db.runAsync(`DELETE FROM categories WHERE id = ?;`, id);
  await queueCloudUpload(); // ← ADDED
}
