// src/ml/hybridPredictor.ts

import { runRuleEngine } from "./ruleEngine";
import { predictNaiveBayes } from "./naiveBayesPredict";

export type HybridResult = {
  label: string | null;
  score: number;
  source: "rule" | "nb" | "combined" | "none";
  why: string[];
};

// NB override threshold — only override rule if NB is VERY confident
const NB_OVERRIDE_THRESHOLD = 0.85;

// Normal NB threshold when rule did NOT match
const NB_THRESHOLD = 0.6;

export async function hybridPredict(note?: string, merchant?: string): Promise<HybridResult> {
  const text = [note, merchant].filter(Boolean).join(" ").trim();

  if (!text) {
    return { label: null, score: 0, source: "none", why: ["No text provided"] };
  }

  // 1. Run both engines
  const rule = runRuleEngine(text);
  const nb = await predictNaiveBayes(text);

  // 2. If rule matches ANY keyword
  if (rule.label) {

    // (a) NB strongly disagrees → let NB override
    if (nb.label && nb.label !== rule.label && nb.score >= NB_OVERRIDE_THRESHOLD) {
      return {
        label: nb.label,
        score: nb.score,
        source: "nb",
        why: [
          ...nb.why,
          `NB override rule (score=${nb.score.toFixed(3)})`
        ]
      };
    }

    // (b) Otherwise rule wins
    return {
      label: rule.label,
      score: 1,
      source: "rule",
      why: [
        ...rule.why,
        `Rule match used (NB score ${nb.score.toFixed(3)})`
      ]
    };
  }

  // 3. No rule match → use NB if confident
  if (nb.label && nb.score >= NB_THRESHOLD) {
    return {
      label: nb.label,
      score: nb.score,
      source: "nb",
      why: [
        ...nb.why,
        `NB used (no rule match)`
      ]
    };
  }

  // 4. Nothing strong
  return {
    label: null,
    score: Math.max(rule.score, nb.score),
    source: "none",
    why: ["Low confidence from both engines"]
  };
}

