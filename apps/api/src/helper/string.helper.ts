import { randomBytes } from 'crypto';

export function getRandomString(length: number) {
  const bytes = randomBytes(length);
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const result = [];

  for (let i = 0; i < length; i++) {
    const randomByte = bytes[i];
    result.push(characters[randomByte % characters.length]);
  }

  return result.join('');
}
