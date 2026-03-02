export interface ParsedLine {
  label: string;
  value: string;
  delta?: string;
}

/**
 * Parses "Label: Value: Delta" or "Label: Value" lines.
 * Colons inside the value (e.g. $1,234.56) are handled by
 * splitting from the left on ": " (colon-space).
 */
export function parseLine(raw: string): ParsedLine | null {
  const parts = raw.split(/:\s+/);
  if (parts.length < 2) return null;

  const label = parts[0].trim();
  const value = parts[1].trim();
  const delta = parts[2]?.trim();

  if (!label || !value) return null;
  return { label, value, delta: delta || undefined };
}

export function parseLines(block: string): ParsedLine[] {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter((p): p is ParsedLine => p !== null);
}
