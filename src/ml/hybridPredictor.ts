// src/ml/hybridPredictor.ts
/// <reference lib="es2015" />

import { runRuleEngine } from "./ruleEngine";
import { predictNaiveBayes } from "./naiveBayesPredict";

export type HybridResult = {
  label: string | null;
  score: number;
  source: "rule" | "nb" | "combined" | "none";
  why: string[];
};

const NB_OVERRIDE_THRESHOLD = 0.85;
const NB_THRESHOLD = 0.6;

export async function hybridPredict(note?: string, merchant?: string): Promise<HybridResult> {
  const text = [note, merchant].filter(Boolean).join(" ").trim();

  if (!text) {
    return { label: null, score: 0, source: "none", why: ["No text provided"] };
  }

  const rule = runRuleEngine(text);
  const nb = await predictNaiveBayes(text);

  if (rule.label) {

    if (nb.label && nb.label !== rule.label && nb.score >= NB_OVERRIDE_THRESHOLD) {
      return {
        label: nb.label,
        score: nb.score,
        source: "nb",
        why: [...nb.why, `NB override fuzzy rule`]
      };
    }

    return {
      label: rule.label,
      score: rule.score,
      source: "rule",
      why: [...rule.why, `Rule used (NB: ${nb.score.toFixed(2)})`]
    };
  }

  if (nb.label && nb.score >= NB_THRESHOLD) {
    return {
      label: nb.label,
      score: nb.score,
      source: "nb",
      why: [...nb.why, `NB fallback`]
    };
  }

  return {
    label: null,
    score: Math.max(rule.score, nb.score),
    source: "none",
    why: ["Low confidence"]
  };
}
