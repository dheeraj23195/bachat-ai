// src/ml/naiveBayesPredict.ts
import { tokenize } from "./tokenizer";
import { queryAsync, getVocabSize } from "./db";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";


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

// Fetch word counts for a list of tokens
async function getWordCountsForTokens(words: string[]): Promise<WordFreqRow[]> {
  if (!words.length) return [];
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

// Improved Naive Bayes prediction
export async function predictNaiveBayes(text: string): Promise<NBResult> {
  if (!text || text.trim().length === 0) {
    return { label: null, score: 0, why: [] };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { label: null, score: 0, why: [] };
  }

  const uniqueTokens = Array.from(new Set(tokens));

  const totals = await getCategoryTotals();
  const vocabSize = (await getVocabSize()) || 1;

  const totalDocs = totals.reduce((acc, row) => acc + (row.doc_count || 0), 0);
  if (totalDocs === 0) {
    return { label: null, score: 0, why: ["Model has no training data"] };
  }

  const rows = await getWordCountsForTokens(uniqueTokens);

  // Map word -> rows
  const wordMap: Record<string, WordFreqRow[]> = {};
  for (const r of rows) {
    if (!wordMap[r.word]) wordMap[r.word] = [];
    wordMap[r.word].push(r);
  }

  // ✅ FILTER: keep only tokens that exist in at least one category
  const validTokens = uniqueTokens.filter((token) => {
    return wordMap[token] && wordMap[token].length > 0;
  });

  // ✅ If no meaningful tokens exist, do NOT guess
  if (validTokens.length === 0) {
    return {
      label: null,
      score: 0,
      why: ["All tokens are unseen by the model"]
    };
  }

  const categoryScores: Record<string, number> = {};
  const reasons: Record<string, string[]> = {};

  for (const cat of totals) {
    const prior = Math.log((cat.doc_count || 1) / totalDocs);
    categoryScores[cat.category_id] = prior;
    reasons[cat.category_id] = [
      `Prior ${(cat.doc_count || 1)}/${totalDocs}`
    ];
  }

  for (const token of validTokens) {
    const rowsForToken = wordMap[token];

    for (const cat of totals) {
      const categoryId = cat.category_id;
      const match = rowsForToken.find((r) => r.category_id === categoryId);
      const count = match ? match.count : 0;

      const prob = (count + 1) / (cat.total_words + vocabSize);
      const logProb = Math.log(prob);

      categoryScores[categoryId] += logProb;

      if (match) {
        reasons[categoryId].push(
          `Token "${token}" found ${count}× in ${categoryId}`
        );
      }
    }
  }

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestLogScore] = sorted[0];

  const maxLog = bestLogScore;
  const probs = sorted.map(([_, log]) => Math.exp(log - maxLog));
  const sumProbs = probs.reduce((a, b) => a + b, 0);
  const bestProbability = probs[0] / sumProbs;

  // ✅ FINAL SAFETY: must have minimum signal
  if (bestProbability < 0.55) {
    return {
      label: null,
      score: bestProbability,
      why: ["Prediction too weak / dominated by prior"]
    };
  }

  return {
    label: bestCategory,
    score: bestProbability,
    why: reasons[bestCategory]
  };
}
