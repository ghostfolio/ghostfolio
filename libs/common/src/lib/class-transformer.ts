import { Big } from 'big.js';

export function transformToMapOfBig({
  value
}: {
  value: { [key: string]: string };
}): {
  [key: string]: Big;
} {
  const mapOfBig: { [key: string]: Big } = {};

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
