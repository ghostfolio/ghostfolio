import type { Type as ActivityType } from '@ghostfolio/prisma/enums';

/**
 * An activity as Ghostfolio AI reads it from a file, with the asset and the
 * account as printed
 */
export interface AiActivityRow {
  accountName?: string | null;
  currency?: string | null;
  date: string;
  fee: number;
  isin?: string | null;
  name?: string | null;
  quantity: number;
  symbol?: string | null;
  type: ActivityType;
  unitPrice: number;
}
