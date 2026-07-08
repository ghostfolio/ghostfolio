import { createHmac } from 'node:crypto';

export function createSha512HmacHash(value: string, salt: string) {
  const hash = createHmac('sha512', salt);
  hash.update(value);

  return hash.digest('hex');
}
