import { OrderService } from '@ghostfolio/api/app/order/order.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getTransactionHistoryTool(deps: {
  orderService: OrderService;
  userId: string;
  userCurrency: string;
}) {
  return tool({
    description:
      "Get the user's transaction history (buy, sell, dividend activities) with optional filters by type, date range, or symbol",
    parameters: z.object({
      types: z
        .array(
          z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY'])
        )
        .optional()
        .describe('Filter by activity types'),
      take: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of transactions to return')
    }),
    execute: async ({ types, take }) => {
      const typedTypes = types as
        | ('BUY' | 'SELL' | 'DIVIDEND' | 'FEE' | 'INTEREST' | 'LIABILITY')[]
        | undefined;

      const { activities, count } = await deps.orderService.getOrders({
        take,
        userId: deps.userId,
        userCurrency: deps.userCurrency,
        types: typedTypes,
        sortColumn: 'date',
        sortDirection: 'desc',
        filters: []
      });

      return {
        totalCount: count,
        transactions: activities.map((a) => ({
          date: a.date,
          type: a.type,
          symbol: a.SymbolProfile?.symbol ?? 'N/A',
          name: a.SymbolProfile?.name ?? 'N/A',
          quantity: a.quantity,
          unitPrice: a.unitPrice,
          fee: a.fee,
          currency: a.SymbolProfile?.currency ?? a.currency,
          value: a.value
        }))
      };
    }
  });
}
