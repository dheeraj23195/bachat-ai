// src/services/wipe.ts

import { getDb } from "./db";
import { useTransactionsStore } from "../store/useTransactionsStore";

export async function wipeAllAppData() {
  const db = await getDb();

  // Delete all rows
  await db.runAsync(`DELETE FROM transactions;`);
  await db.runAsync(`DELETE FROM budgets;`);
  await db.runAsync(`DELETE FROM categories;`);

  // Clear zustand store
  useTransactionsStore.setState({ transactions: [] });

  return true;
}
