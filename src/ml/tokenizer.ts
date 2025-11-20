// src/ml/tokenizer.ts

// Basic English stopwords (kept small to avoid removing useful words)
const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "from",
    "with", "of", "by", "is", "was", "were", "be", "been", "are",
  ]);
  
  // Utility: clean and split text
  export function tokenize(text: string): string[] {
    if (!text) return [];
  
    // Lowercase
    text = text.toLowerCase();
  
    // Remove punctuation (keep words and numbers)
    text = text.replace(/[^a-z0-9\s]/g, " ");
  
    // Split by whitespace
    let tokens = text.split(/\s+/).filter(Boolean);
  
    // Remove stopwords & very short tokens
    tokens = tokens.filter((t) => t.length > 2 && !STOPWORDS.has(t));
  
    // Limit max tokens to avoid overloading model
    return tokens.slice(0, 10);
  }
  