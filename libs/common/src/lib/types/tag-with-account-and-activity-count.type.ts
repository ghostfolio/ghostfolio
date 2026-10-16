import type { Tag } from '@ghostfolio/prisma/browser';

export type TagWithAccountAndActivityCount = Tag & {
  accountCount: number;
  activityCount: number;
};
