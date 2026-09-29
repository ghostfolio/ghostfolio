import { Tag } from '@prisma/client';

export type TagWithAccountAndActivityCount = Tag & {
  accountCount: number;
  activityCount: number;
};
