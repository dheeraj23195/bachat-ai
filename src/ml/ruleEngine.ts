// src/ml/ruleEngine.ts

import { RULE_KEYWORDS } from "./ruleDict";
import { tokenize } from "./tokenizer";

export type RuleEngineResult = {
  label: string | null;
  score: number;
  why: string[];
};

// Levenshtein distance
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[a.length][b.length];
}

// Allow 1 typo for short, 2 for long words
function fuzzyMatch(a: string, b: string) {
  const dist = editDistance(a, b);
  const limit = a.length > 6 ? 2 : 1;
  return dist <= limit;
}

export function runRuleEngine(text: string): RuleEngineResult {
  if (!text || !text.trim()) {
    return { label: null, score: 0, why: [] };
  }

  const tokens = tokenize(text);
  const why: string[] = [];

  for (const categoryId of Object.keys(RULE_KEYWORDS)) {
    const keywords = RULE_KEYWORDS[categoryId];

    for (const token of tokens) {
      for (const keyword of keywords) {
        if (keyword === token) {
          why.push(`Exact match "${token}" → ${categoryId}`);
          return { label: categoryId, score: 1, why };
        }

        if (fuzzyMatch(token, keyword)) {
          why.push(`Fuzzy match "${token}" ≈ "${keyword}" → ${categoryId}`);
          return { label: categoryId, score: 0.85, why };
        }
      }
    }
  }

  return { label: null, score: 0, why };
}
