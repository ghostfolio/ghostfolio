import { Big } from 'big.js';

export function transformToMapOfBig({
  value
}: {
  value: Record<string, string>;
}): Record<string, Big> {
  const mapOfBig: Record<string, Big> = {};

  for (const key in value) {
    mapOfBig[key] = new Big(value[key]);
  }

  return mapOfBig;
}

export function transformToBig({ value }: { value: string }): Big {
  if (value === null) {
    return null;
  }

  return new Big(value);
}
