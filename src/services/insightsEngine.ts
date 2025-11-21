// src/services/insightsEngine.ts

import { getDb } from "./db";
import type * as SQLite from "expo-sqlite";
import { startOfMonth, endOfMonth, subMonths, getDate, getDaysInMonth } from "date-fns";

export type InsightsResult = {
  overview: {
    currentMonthSpend: number;
    lastMonthSpend: number;
    percentageChange: number;
    topCategories: {
      id: string;
      name: string;
      amount: number;
    }[];
  };

  diagnostics: {
    spikes: {
      categoryName: string;
      amount: number;
      date: string;
    }[];

    recurringSubscriptions: {
      merchant: string;
      amount: number;
    }[];
  };

  predictions: {
    expectedMonthEndSpend: number;
    categoryOverruns: {
      categoryName: string;
      excessAmount: number;
    }[];
  };

  recommendations: string[];
};

export async function generateInsights(): Promise<InsightsResult> {
  const db = await getDb();

  const overview = await getMonthlyOverview(db);
  const diagnostics = await getDiagnostics(db);
  const predictions = await getPredictions(db);
  const recommendations = generateRecommendations(overview, diagnostics, predictions);

  return {
    overview,
    diagnostics,
    predictions,
    recommendations,
  };
}

// ---------------------- OVERVIEW ENGINE ----------------------

async function getMonthlyOverview(db: SQLite.SQLiteDatabase) {
  const now = new Date();
  const currentStart = startOfMonth(now).toISOString();
  const currentEnd = endOfMonth(now).toISOString();

  const lastMonth = subMonths(now, 1);
  const lastStart = startOfMonth(lastMonth).toISOString();
  const lastEnd = endOfMonth(lastMonth).toISOString();

  const currentRow = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date BETWEEN ? AND ?;`,
    currentStart,
    currentEnd
  );

  const lastRow = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date BETWEEN ? AND ?;`,
    lastStart,
    lastEnd
  );

  const currentMonthSpend = currentRow?.total ?? 0;
  const lastMonthSpend = lastRow?.total ?? 0;

  const percentageChange = lastMonthSpend === 0
    ? 0
    : ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;

  const topCategoriesRows = await db.getAllAsync<any>(
    `
    SELECT c.id, c.name, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date BETWEEN ? AND ?
    GROUP BY c.id
    ORDER BY total DESC
    LIMIT 3;
  `,
    currentStart,
    currentEnd
  );

  const topCategories = topCategoriesRows.map((r: any) => ({
    id: r.id,
    name: r.name,
    amount: r.total,
  }));

  return {
    currentMonthSpend,
    lastMonthSpend,
    percentageChange,
    topCategories,
  };
}

// ---------------------- DIAGNOSTICS ENGINE ----------------------

async function getDiagnostics(db: SQLite.SQLiteDatabase) {
  const spikes = await detectSpikes(db);
  const recurringSubscriptions = await detectRecurringSubscriptions(db);

  return {
    spikes,
    recurringSubscriptions,
  };
}

async function detectSpikes(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<any>(
    `SELECT t.amount, t.date, c.name as categoryName FROM transactions t JOIN categories c ON t.category_id = c.id;`
  );

  const categoryTotals: Record<string, number[]> = {};

  rows.forEach((tx: any) => {
    if (!categoryTotals[tx.categoryName]) {
      categoryTotals[tx.categoryName] = [];
    }
    categoryTotals[tx.categoryName].push(tx.amount);
  });

  const spikes: any[] = [];

  for (const tx of rows) {
    const amounts = categoryTotals[tx.categoryName];
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    if (tx.amount > avg * 2) {
      spikes.push({
        categoryName: tx.categoryName,
        amount: tx.amount,
        date: tx.date,
      });
    }
  }

  return spikes;
}

async function detectRecurringSubscriptions(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<any>(
    `SELECT encrypted_merchant as merchant, amount FROM transactions WHERE is_recurring = 1;`
  );

  const unique: Record<string, number> = {};

  rows.forEach((r: any) => {
    const key = `${r.merchant}-${r.amount}`;
    unique[key] = r.amount;
  });

  return Object.keys(unique).map((key) => {
    const [merchant, amount] = key.split("-");
    return {
      merchant: merchant || "Subscription",
      amount: Number(amount),
    };
  });
}

// ---------------------- PREDICTION ENGINE ----------------------

async function getPredictions(db: SQLite.SQLiteDatabase) {
  const now = new Date();
  const currentStart = startOfMonth(now).toISOString();
  const currentDay = getDate(now);
  const daysInMonth = getDaysInMonth(now);

  const spendRow = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?;`,
    currentStart
  );

  const spentSoFar = spendRow?.total ?? 0;
  const dailyRate = spentSoFar / Math.max(currentDay, 1);
  const expectedMonthEndSpend = dailyRate * daysInMonth;

  const budgets = await db.getAllAsync<any>(
    `SELECT b.limit_amount, c.name as categoryName FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.is_active = 1;`
  );

  const categoryOverruns: any[] = [];

  for (const bud of budgets) {
    if (expectedMonthEndSpend > bud.limit_amount) {
      categoryOverruns.push({
        categoryName: bud.categoryName,
        excessAmount: expectedMonthEndSpend - bud.limit_amount,
      });
    }
  }

  return {
    expectedMonthEndSpend,
    categoryOverruns,
  };
}

// ---------------------- RECOMMENDATION ENGINE ----------------------

function generateRecommendations(
  overview: any,
  diagnostics: any,
  predictions: any
): string[] {
  const recs: string[] = [];

  if (overview.percentageChange > 10) {
    recs.push("Your spending has significantly increased compared to last month.");
  }

  if (diagnostics.spikes.length > 0) {
    recs.push("Unusual spikes in spending detected. Review recent large transactions.");
  }

  if (diagnostics.recurringSubscriptions.length > 2) {
    recs.push("You have multiple active subscriptions. Consider cancelling unused ones.");
  }

  if (predictions.categoryOverruns.length > 0) {
    recs.push("You are likely to exceed some budget limits this month. Try reducing spend.");
  }

  return recs;
}