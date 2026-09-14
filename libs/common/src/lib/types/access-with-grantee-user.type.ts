import type { Access, User } from '@ghostfolio/prisma/browser';

export type AccessWithGranteeUser = Access & { granteeUser?: User | null };
