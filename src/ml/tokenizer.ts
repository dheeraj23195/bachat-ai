// src/ml/tokenizer.ts

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "from",
  "with", "of", "by", "is", "was", "were", "be", "been", "are",
]);

function collapseRepeats(word: string) {
  return word.replace(/(.)\1{2,}/g, "$1$1");
}

export function tokenize(text: string): string[] {
  if (!text) return [];

  text = text.toLowerCase();
  text = text.replace(/[^a-z0-9\s]/g, " ");

  let tokens = text.split(/\s+/).filter(Boolean);

  tokens = tokens
    .map(collapseRepeats)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  return tokens.slice(0, 10);
}
