import type { Platform } from '@ghostfolio/prisma/browser';

export interface PlatformResponse extends Pick<
  Platform,
  'id' | 'name' | 'url'
> {}
