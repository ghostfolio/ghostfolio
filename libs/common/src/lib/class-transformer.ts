import { Big } from 'big.js';

export function transformToBig({ value }: { value: string }): Big {
  if (value === null) {
    return null;
  }

  return new Big(value);
}
