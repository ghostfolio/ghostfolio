import { Account, Order } from '@prisma/client';

export type OrderWithAccount = Order & { Account?: Account };
