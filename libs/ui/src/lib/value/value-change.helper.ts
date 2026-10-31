/**
 * Returns the direction in which a displayed number has changed, or
 * `undefined` if it is unchanged at the displayed precision.
 */
export function getValueChangeDirection({
  currentValue,
  digits,
  previousValue
}: {
  currentValue: unknown;
  digits: number;
  previousValue: unknown;
}): 'down' | 'up' | undefined {
  if (
    typeof currentValue !== 'number' ||
    typeof previousValue !== 'number' ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(previousValue)
  ) {
    return undefined;
  }

  const factor = 10 ** digits;
  const difference =
    Math.round(currentValue * factor) - Math.round(previousValue * factor);

  if (difference === 0) {
    return undefined;
  }

  return difference > 0 ? 'up' : 'down';
}
