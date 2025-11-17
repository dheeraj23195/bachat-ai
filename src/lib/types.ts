// src/lib/types.ts

// --- Enums & basic types ---

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "OTHER";

export type ThemePreference = "light" | "dark" | "system";

export type TransactionType = "expense" | "income";

export type PaymentMethod = "UPI" | "Cash" | "Card" | "Other";

export type BudgetPeriod = "monthly" | "weekly" | "custom";

export type AlertType = "monthly-total" | "category-budget" | "daily-overspend";

export type AISource = "rule-engine" | "naive-bayes" | "hybrid";

// --- Core domain models ---

export interface Transaction {
  id: string; // UUID or string ID
  type: TransactionType; // expense / income

  amount: number; // stored as integer paise/cents or float (we'll pick when designing DB)
  currency: CurrencyCode;

  date: string; // ISO string: '2025-11-15T10:30:00.000Z'
  categoryId: string | null;

  paymentMethod: PaymentMethod;

  // Encrypted fields (AES-GCM) - stored as ciphertext in DB
  encryptedNote?: string | null;
  encryptedMerchant?: string | null;
  encryptedMetadata?: string | null; // any future JSON (tags, location, etc.)

  // Recurring
  isRecurring: boolean;
  recurringRule?: string | null; // future: e.g. RRULE-style text or custom JSON

  // Internal metadata
  createdAt: string; // ISO
  updatedAt: string; // ISO
  source: "manual" | "csv-import" | "ai-generated"; // for insights/debug
}

export interface Budget {
  id: string;

  // null categoryId means "overall/monthly budget"
  categoryId: string | null;

  period: BudgetPeriod; // monthly / weekly / custom
  periodStartDay?: number | null; // e.g. 1 for "1st of month", or 5 for "5th"

  limitAmount: number;
  currency: CurrencyCode;

  alertThresholdPercent: number; // e.g. 80 for 80%

  // For future multi-user / multi-device semantics if needed
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

// Category is mostly static / user-editable
export interface Category {
  id: string;
  name: string;
  icon?: string | null; // icon name or code, optional
  colorHex?: string | null; // '#F97316' etc.
  isDefault: boolean; // true for built-ins
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string; // we can just use 'default' for single-user scenario

  currency: CurrencyCode;
  theme: ThemePreference;

  pinEnabled: boolean;
  biometricEnabled: boolean;

  aiSuggestionsEnabled: boolean;
  budgetAlertsEnabled: boolean;

  // For future toggles
  onboardingCompleted: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  type: AlertType;

  // which budget/category this alert belongs to (if applicable)
  budgetId?: string | null;
  categoryId?: string | null;

  thresholdPercent?: number | null; // e.g. 80% of budget
  enabled: boolean;

  createdAt: string;
  updatedAt: string;
}

// --- AI-related types ---

export interface AISuggestion {
  label: string; // category name or id (we can decide mapping later)
  score: number; // 0–1
  source: AISource;
  why: string; // human-readable explanation
}

// Optional: training/example row for on-device Naive Bayes
export interface AICategoryTrainingExample {
  id: string;
  transactionId: string; // link back to transaction
  text: string; // combined note/merchant/etc.
  categoryId: string;
  createdAt: string;
}

// --- Helper filter types for services ---

export interface TransactionFilter {
  fromDate?: string; // ISO
  toDate?: string; // ISO
  categoryIds?: string[];
  types?: TransactionType[];
  minAmount?: number;
  maxAmount?: number;
  source?: Array<Transaction["source"]>;
}
