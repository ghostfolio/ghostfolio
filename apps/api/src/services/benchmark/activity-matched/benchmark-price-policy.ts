export const DEFAULT_MAX_PRICE_AGE_DAYS = 7;

export function validateMaxPriceAgeDays(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Invalid maximum price age');
  }

  return value;
}
