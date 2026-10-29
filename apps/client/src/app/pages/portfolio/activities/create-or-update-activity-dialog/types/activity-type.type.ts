import { Type } from '@ghostfolio/prisma/enums';

export const ActivityType = {
  ...Type,
  VALUABLE: 'VALUABLE'
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
