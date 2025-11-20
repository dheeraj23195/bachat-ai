// src/ml/MLService.ts

import { initMLTables } from "./db";
import { hybridPredict } from "./hybridPredictor";
import { trainNaiveBayes, TrainingInput } from "./naiveBayesTraining";

export type PredictInput = {
  note?: string;
  merchant?: string;
};

export type PredictInputOrString = PredictInput | string;


export type TransactionInput = {
  id: string;
  note?: string;
  merchant?: string;
  categoryId: string; // confirmed user category
};

// MLService = the ONLY class your app needs to call
export class MLService {
  private static instance: MLService;

  // Singleton pattern
  static getInstance() {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  private initialized = false;

  // Initialize tables and DB on app start
  async init() {
    if (this.initialized) return;
    await initMLTables();
    this.initialized = true;
    console.log("[ML] Initialized ML tables");
  }

  // Predict category (UI will call this)
// Normalize HybridResult → UI-friendly result
async predictCategory(input: PredictInput | string) {
  // Step 1: unify input
  console.log("🔥 MLService.predictCategory CALLED WITH:", input);

  let text: string;
  if (typeof input === "string") {
    text = input;
  } else {
    text = [input.note, input.merchant].filter(Boolean).join(" ").trim();
  }

  if (!text) return null;

  // Step 2: run hybrid predictor
  const raw = await hybridPredict(text, undefined);

  // raw = HybridResult { label, score, source, why[] }
  console.log("🔥 MLService.predictCategory RESULT:", raw);


  if (!raw.label) {
    return null; // no confident prediction
  }

  // Step 3: convert HybridResult → UI result
  const category = raw.label;
  const confidence = raw.score; // your "score" IS the confidence
  const explanation = raw.why.join("; ");

  return {
    category,
    confidence,
    explanation,
  };
}


  // Train model when user sets/edits category
  async trainOnTransaction(tx: TransactionInput) {
    if (!tx.categoryId) return;

    const combinedText = [tx.note, tx.merchant].filter(Boolean).join(" ").trim();
    if (!combinedText) return;

    const trainingInput: TrainingInput = {
      transactionId: tx.id,
      text: combinedText,
      categoryId: tx.categoryId,
    };

    await trainNaiveBayes(trainingInput);
  }

  // Clear all ML data (optional feature for privacy)
  async resetModel() {
    console.log("[ML] Reset model requested — TODO: drop and recreate tables");
    // You can add table reset logic later if needed
  }
}
export const mlService = new MLService();

