import { Account, Platform } from '@prisma/client';

export type AccountWithPlatform = Account & { Platform?: Platform };
