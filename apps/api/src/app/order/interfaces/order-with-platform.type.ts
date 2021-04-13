import { Order, Platform } from '@prisma/client';

export type OrderWithPlatform = Order & { Platform?: Platform };
