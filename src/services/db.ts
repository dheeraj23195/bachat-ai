// src/services/db.ts

import * as SQLite from "expo-sqlite";

const DB_NAME = "bachat_ai.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Get (or lazily open) the singleton database instance.
 * Always use `await getDb()` anywhere you need the DB.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

/**
 * Initialize the database and run migrations.
 * Call this once on app startup (e.g. in App.tsx).
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await runMigrations(db);
}

/**
 * Wipe all app data from the DB and re-run migrations from scratch.
 * We'll hook this to "Wipe all data" in Settings later.
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();

  // Drop tables if they exist
  await db.execAsync("DROP TABLE IF EXISTS ai_training_examples;");
  await db.execAsync("DROP TABLE IF EXISTS alert_rules;");
  await db.execAsync("DROP TABLE IF EXISTS user_settings;");
  await db.execAsync("DROP TABLE IF EXISTS categories;");
  await db.execAsync("DROP TABLE IF EXISTS budgets;");
  await db.execAsync("DROP TABLE IF EXISTS transactions;");

  // Reset user_version and re-run migrations
  await setUserVersion(db, 0);
  await runMigrations(db);
}

/* -------------------------------------------------------------------------- */
/*                               MIGRATIONS                                    */
/* -------------------------------------------------------------------------- */

type Migration = (db: SQLite.SQLiteDatabase) => Promise<void>;

/**
 * Each item is a migration step. Index 0 = version 1, index 1 = version 2, etc.
 */
const MIGRATIONS: Migration[] = [
  // --- Migration 1: Initial schema ---
  async (db) => {
    // Transactions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        date TEXT NOT NULL,
        category_id TEXT,
        payment_method TEXT NOT NULL,
        encrypted_note TEXT,
        encrypted_merchant TEXT,
        encrypted_metadata TEXT,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurring_rule TEXT,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Budgets table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category_id TEXT,
        period TEXT NOT NULL,
        period_start_day INTEGER,
        limit_amount REAL NOT NULL,
        currency TEXT NOT NULL,
        alert_threshold_percent REAL NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Categories table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color_hex TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // User settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        currency TEXT NOT NULL,
        theme TEXT NOT NULL,
        pin_enabled INTEGER NOT NULL DEFAULT 0,
        biometric_enabled INTEGER NOT NULL DEFAULT 0,
        ai_suggestions_enabled INTEGER NOT NULL DEFAULT 1,
        budget_alerts_enabled INTEGER NOT NULL DEFAULT 1,
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Alert rules table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        budget_id TEXT,
        category_id TEXT,
        threshold_percent REAL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // AI training examples table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ai_training_examples (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        text TEXT NOT NULL,
        category_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Helpful indexes
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`
    );
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`
    );
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);`
    );
  },

  async (db) => {
    await db.execAsync(
      `ALTER TABLE user_settings ADD COLUMN avatar_base64 TEXT;`
    );
  },
];

/* -------------------------------------------------------------------------- */
/*                            USER_VERSION HELPERS                             */
/* -------------------------------------------------------------------------- */

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  return row?.user_version ?? 0;
}

async function setUserVersion(
  db: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

/**
 * Run any pending migrations based on PRAGMA user_version.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const current = await getUserVersion(db);
  const target = MIGRATIONS.length;

  if (current >= target) {
    return; // up to date
  }

  for (let i = current; i < target; i++) {
    const migration = MIGRATIONS[i];
    await migration(db);
  }

  await setUserVersion(db, target);
}
