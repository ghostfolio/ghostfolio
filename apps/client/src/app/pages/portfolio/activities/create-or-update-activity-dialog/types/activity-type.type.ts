import { Type } from '@prisma/client';

export const ActivityType = {
  ...Type,
  VALUABLE: 'VALUABLE'
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
