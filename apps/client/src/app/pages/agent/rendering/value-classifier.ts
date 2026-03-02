export type ValueSentiment = 'positive' | 'negative' | 'neutral';

const CURRENCY_RE = /^[$€£¥]\s?[+-]?[\d,.]+$/;
const PERCENT_RE = /^[+-]?\d+(?:,\d{3})*(?:\.\d+)?%$/;
const NUMBER_RE = /^[+-]?[\d,.]+$/;
const TICKER_RE = /^[A-Z]{1,5}$/;

export function classifySentiment(text: string): ValueSentiment {
  const t = text.trim();
  if (t.startsWith('+')) return 'positive';
  if (t.startsWith('-') || t.startsWith('\u2212')) return 'negative';
  return 'neutral';
}

export type CellType = 'ticker' | 'currency' | 'percent' | 'number' | 'text';

export function classifyCell(text: string): CellType {
  const t = text.trim();
  if (TICKER_RE.test(t)) return 'ticker';
  if (CURRENCY_RE.test(t)) return 'currency';
  if (PERCENT_RE.test(t)) return 'percent';
  if (NUMBER_RE.test(t) && t.length > 0) return 'number';
  return 'text';
}
