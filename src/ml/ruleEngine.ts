// src/ml/ruleEngine.ts

import { RULE_KEYWORDS } from "./ruleDict";
import { tokenize } from "./tokenizer";

export type RuleEngineResult = {
  label: string | null;
  score: number;
  why: string[];
};

/**
 * RULE ENGINE BEHAVIOR:
 * - Binary match: ANY keyword match -> score = 1
 * - No weights / no normalization
 * - Very fast, very reliable
 * - NB can override later via hybridPredictor
 */
export function runRuleEngine(text: string): RuleEngineResult {
  if (!text || !text.trim()) {
    return { label: null, score: 0, why: [] };
  }

  const tokens = tokenize(text); // lowercase tokens
  const why: string[] = [];

  // search all categories
  for (const categoryId of Object.keys(RULE_KEYWORDS)) {
    const keywords = RULE_KEYWORDS[categoryId];

    for (const token of tokens) {
      if (keywords.includes(token)) {
        // we found a match → return instantly
        why.push(`Matched "${token}" → ${categoryId}`);
        return {
          label: categoryId,
          score: 1, // binary confidence
          why
        };
      }
    }
  }

  // no match found
  return { label: null, score: 0, why };
}
