import { Account, Order, Platform } from '@prisma/client';

type AccountWithPlatform = Account & { Platform?: Platform };

export type OrderWithAccount = Order & { Account?: AccountWithPlatform };
