import { Access, User } from '@prisma/client';

export type AccessWithGranteeUser = Access & { GranteeUser?: User };
