// src/ml/db.ts
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Open ML DB using async API — same as main DB.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("bachat_ml.db");
  }
  return db;
}

/**
 * Execute SQL (no params; must embed manually)
 */
export async function runAsync(sql: string): Promise<void> {
  const database = await getDB();
  await database.execAsync(sql);
}

/**
 * Query helper — getAllAsync supports params safely
 */
export async function queryAsync<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const database = await getDB();
  return database.getAllAsync<T>(sql, params);
}

/**
 * Initialize ML tables
 */
export async function initMLTables() {
  const db = await getDB();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_training_examples (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      text TEXT,
      category_id TEXT,
      created_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS word_frequency (
      word TEXT,
      category_id TEXT,
      count INTEGER,
      PRIMARY KEY (word, category_id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS category_totals (
      category_id TEXT PRIMARY KEY,
      total_words INTEGER,
      doc_count INTEGER
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS model_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log("ML tables initialized.");
}

/**
 * Increment token frequency for a word/category pair.
 */
export async function incrementWordCount(word: string, category: string) {
  await runAsync(`
    INSERT INTO word_frequency (word, category_id, count)
    VALUES ('${word}', '${category}', 1)
    ON CONFLICT(word, category_id)
    DO UPDATE SET count = count + 1;
  `);
}

/**
 * Update category totals (total tokens + doc counts)
 */
export async function incrementCategoryTotals(
  category: string,
  tokenCount: number
) {
  await runAsync(`
    INSERT INTO category_totals (category_id, total_words, doc_count)
    VALUES ('${category}', ${tokenCount}, 1)
    ON CONFLICT(category_id)
    DO UPDATE SET 
      total_words = total_words + ${tokenCount},
      doc_count = doc_count + 1;
  `);
}

/**
 * Save global vocab size (needed for Naive Bayes smoothing)
 */
export async function updateVocabSize(vocabSize: number) {
  await runAsync(`
    INSERT INTO model_meta (key, value)
    VALUES ('vocab_size', '${vocabSize}')
    ON CONFLICT(key)
    DO UPDATE SET value = '${vocabSize}';
  `);
}

/**
 * Retrieve vocab size
 */
export async function getVocabSize(): Promise<number> {
  const rows = await queryAsync<{ value: string }>(
    "SELECT value FROM model_meta WHERE key = 'vocab_size' LIMIT 1"
  );
  return rows.length ? parseInt(rows[0].value, 10) : 0;
}
