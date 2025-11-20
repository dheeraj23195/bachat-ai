// src/services/wipe.ts

import { getDb } from "./db";
import { useTransactionsStore } from "../store/useTransactionsStore";
import { ensureDefaultCategories } from "./categories";

export async function wipeAllAppData() {
  const db = await getDb();

  // Delete all rows
  await db.runAsync(`DELETE FROM transactions;`);
  await db.runAsync(`DELETE FROM budgets;`);
  await db.runAsync(`DELETE FROM categories;`);

  // Reset default categories
  await ensureDefaultCategories();

  // Clear zustand store
  useTransactionsStore.setState({ transactions: [] });

  return true;
}
