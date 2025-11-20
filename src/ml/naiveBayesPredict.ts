// src/ml/naiveBayesPredict.ts
import { tokenize } from "./tokenizer";
import { queryAsync, getVocabSize } from "./db";

export type NBResult = {
  label: string | null;
  score: number; // probability 0–1
  why: string[];
};

type WordFreqRow = {
  word: string;
  category_id: string;
  count: number;
};

type TotalsRow = {
  category_id: string;
  total_words: number;
  doc_count: number;
};

// Fetch word counts for a list of tokens (batch)
async function getWordCountsForTokens(words: string[]): Promise<WordFreqRow[]> {
  if (!words.length) return [];
  // Build SQL safe IN list
  const inList = words.map((w) => `'${w.replace(/'/g, "''")}'`).join(", ");
  return queryAsync<WordFreqRow>(
    `SELECT word, category_id, count FROM word_frequency WHERE word IN (${inList});`
  );
}

// Fetch totals for all categories
async function getCategoryTotals(): Promise<TotalsRow[]> {
  return queryAsync<TotalsRow>(`
    SELECT category_id, total_words, doc_count FROM category_totals;
  `);
}

// Naive Bayes prediction function (optimized)
export async function predictNaiveBayes(text: string): Promise<NBResult> {
  if (!text || text.trim().length === 0) {
    return { label: null, score: 0, why: [] };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { label: null, score: 0, why: [] };
  }

  // Unique tokens only (NB uses repetition via counts in the formula, but we query counts only once)
  const uniqueTokens = Array.from(new Set(tokens));

  // Fetch category totals & vocab size
  const totals = await getCategoryTotals();
  const vocabSize = (await getVocabSize()) || 1;

  const totalDocs = totals.reduce((acc, row) => acc + (row.doc_count || 0), 0);
  if (totalDocs === 0) {
    return { label: null, score: 0, why: ["Model has no training data"] };
  }

  // Fetch all relevant word counts in one go
  const rows = await getWordCountsForTokens(uniqueTokens);
  // Map by word -> array of rows
  const wordMap: Record<string, WordFreqRow[]> = {};
  for (const r of rows) {
    if (!wordMap[r.word]) wordMap[r.word] = [];
    wordMap[r.word].push(r);
  }

  const categoryScores: Record<string, number> = {};
  const reasons: Record<string, string[]> = {};

  // Initialize log probabilities (priors)
  for (const cat of totals) {
    const prior = Math.log((cat.doc_count || 1) / totalDocs);
    categoryScores[cat.category_id] = prior;
    reasons[cat.category_id] = [
      `Prior: ${((cat.doc_count || 1) / totalDocs).toFixed(3)}`
    ];
  }

  // For repeated tokens in the text, we need to account for frequency;
  // So compute token frequencies from original tokens
  const tokenFreq: Record<string, number> = {};
  for (const t of tokens) tokenFreq[t] = (tokenFreq[t] || 0) + 1;

  // Evaluate each unique token but multiply logProb by its frequency
  for (const token of uniqueTokens) {
    const rowsForToken = wordMap[token] || [];

    for (const cat of totals) {
      const categoryId = cat.category_id;
      const match = rowsForToken.find((r) => r.category_id === categoryId);
      const count = match ? match.count : 0;

      const prob = (count + 1) / (cat.total_words + vocabSize); // Laplace smoothing
      const logProb = Math.log(prob);

      // Multiply by token frequency in the input
      categoryScores[categoryId] += logProb * (tokenFreq[token] || 1);

      if (match) {
        reasons[categoryId].push(
          `Token "${token}" found ${count}× in ${categoryId} (log ${logProb.toFixed(4)})`
        );
      } else {
        reasons[categoryId].push(
          `Token "${token}" unseen in ${categoryId} (log ${logProb.toFixed(4)})`
        );
      }
    }
  }

  // Choose best scoring category
  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestLogScore] = sorted[0];

  // Convert log-probability to normalized probability
  const maxLog = bestLogScore;
  const probs = sorted.map(([cat, log]) => Math.exp(log - maxLog));
  const sumProbs = probs.reduce((a, b) => a + b, 0);
  const bestProbability = probs[0] / sumProbs;

  return {
    label: bestCategory,
    score: bestProbability,
    why: reasons[bestCategory]
  };
}

