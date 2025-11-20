// src/ml/naiveBayesTraining.ts
import { tokenize } from "./tokenizer";
import {
  runAsync,
  incrementWordCount,
  incrementCategoryTotals,
  updateVocabSize,
  queryAsync,
} from "./db";

import { v4 as uuidv4 } from "uuid";

// Training example type
export type TrainingInput = {
  transactionId: string;
  text: string;
  categoryId: string;
  weight?: number; // optional integer weight (default 1)
};

// Helper: escape single quotes for safe string interpolation
function escapeSql(s: string) {
  return s.replace(/'/g, "''");
}

// Insert the training example into ai_training_examples table (interpolated)
async function insertTrainingExample(
  id: string,
  transactionId: string,
  text: string,
  categoryId: string
) {
  const SQL = `
    INSERT INTO ai_training_examples (id, transaction_id, text, category_id, created_at)
    VALUES ('${escapeSql(id)}', '${escapeSql(transactionId)}', '${escapeSql(text)}', '${escapeSql(categoryId)}', datetime('now'));
  `;
  await runAsync(SQL);
}

// Check if token exists in word_frequency for given set (batch)
async function existingWords(words: string[]): Promise<string[]> {
  if (!words.length) return [];
  const inList = words.map((w) => `'${escapeSql(w)}'`).join(", ");
  const rows = await queryAsync<{ word: string }>(
    `SELECT DISTINCT word FROM word_frequency WHERE word IN (${inList});`
  );
  return rows.map((r) => r.word);
}

/**
 * Full training on a new labeled example.
 * weight (integer) allows soft/strong training; default = 1.
 */
export async function trainNaiveBayes(input: TrainingInput) {
  const { transactionId, text, categoryId } = input;
  const weight = Math.max(1, Math.round(input.weight ?? 1)); // ensure integer >=1

  // 1. Tokenize input text and compute token counts
  const tokens = tokenize(text);
  if (tokens.length === 0) return;

  const tokenCounts: Record<string, number> = {};
  for (const t of tokens) tokenCounts[t] = (tokenCounts[t] || 0) + 1;

  // Multiply token counts by weight (soft training using integer multiplicity)
  for (const t of Object.keys(tokenCounts)) tokenCounts[t] *= weight;

  const trainingId = uuidv4();

  // 2. Insert into ai_training_examples
  await insertTrainingExample(trainingId, transactionId, text, categoryId);

  // 3. Update frequency of each token under the given category using a single multi-row statement
  // Build rows like: ('word','category',N)
  const rowsSql = Object.entries(tokenCounts)
    .map(([word, cnt]) => `('${escapeSql(word)}', '${escapeSql(categoryId)}', ${cnt})`)
    .join(", ");

  if (rowsSql.length > 0) {
    const sql = `
      INSERT INTO word_frequency (word, category_id, count)
      VALUES ${rowsSql}
      ON CONFLICT(word, category_id) DO UPDATE SET count = count + excluded.count;
    `;
    await runAsync(sql);
  }

  // 4. Update total words + doc count for this category
  const totalTokensAdded = Object.values(tokenCounts).reduce((a, b) => a + b, 0);
  await incrementCategoryTotals(categoryId, totalTokensAdded * 1); // tokenCount param expected integer

  // 5. Update vocab size efficiently:
  // Check which tokens are new (existingWords)
  const uniqueTokens = Object.keys(tokenCounts);
  const existing = await existingWords(uniqueTokens);
  const existingSet = new Set(existing);
  const newTokens = uniqueTokens.filter((t) => !existingSet.has(t));
  if (newTokens.length > 0) {
    // increment vocab by number of new distinct tokens
    // read current vocab and add delta
    const current = (await queryAsync<{ value: string }>("SELECT value FROM model_meta WHERE key = 'vocab_size' LIMIT 1;")) || [];
    const currentVal = current.length ? parseInt(current[0].value, 10) : 0;
    const newVocab = currentVal + newTokens.length;
    await updateVocabSize(newVocab);
  }

  console.log(
    `[NB TRAIN] category=${categoryId} tokens=${tokens.length} (weighted=${totalTokensAdded}) transaction=${transactionId}`
  );
}
