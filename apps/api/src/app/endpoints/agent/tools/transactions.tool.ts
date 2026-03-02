import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';

import type { Type as ActivityType } from '@prisma/client';
import { tool } from 'ai';
import { z } from 'zod';

const ORDER_TYPES = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'FEE',
  'INTEREST',
  'LIABILITY'
] as const;

const CASH_TYPES = ['DEPOSIT', 'WITHDRAWAL'] as const;

const ALL_TYPES = [...ORDER_TYPES, ...CASH_TYPES] as const;

export function createTransactionHistoryTool({
  accountBalanceService,
  accountService,
  orderService,
  userService,
  userId
}: {
  accountBalanceService: AccountBalanceService;
  accountService: AccountService;
  orderService: OrderService;
  userService: UserService;
  userId: string;
}) {
  return tool({
    description:
      'Get transaction/activity history: buys, sells, dividends, fees, deposits, withdrawals. Use when the user asks about their trades, transaction history, activity log, deposits, or withdrawals.',
    inputSchema: z.object({
      types: z
        .array(z.enum(ALL_TYPES))
        .optional()
        .describe(
          'Filter by activity type. Includes DEPOSIT/WITHDRAWAL for cash movements. Omit to get all types.'
        ),
      take: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('Number of results to return (max 100). Defaults to 50.'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort by date. Defaults to desc (newest first).')
    }),
    execute: async ({ types, take = 50, sortDirection = 'desc' }) => {
      try {
        const user = await userService.user({ id: userId });
        const userCurrency = user?.settings?.settings?.baseCurrency ?? 'USD';

        // Split types into order types vs cash types
        const orderTypes = types?.filter(
          (t): t is (typeof ORDER_TYPES)[number] =>
            (ORDER_TYPES as readonly string[]).includes(t)
        );
        const cashTypes = types?.filter((t): t is (typeof CASH_TYPES)[number] =>
          (CASH_TYPES as readonly string[]).includes(t)
        );

        const wantOrders = !types || orderTypes.length > 0;
        const wantCash = !types || cashTypes.length > 0;

        // Fetch orders if needed
        let orderEntries: {
          date: Date;
          type: string;
          symbol?: string;
          name?: string;
          quantity?: number;
          unitPrice?: number;
          currency?: string;
          fee?: number;
          value?: number;
          valueInBaseCurrency?: number;
          account?: string;
        }[] = [];

        if (wantOrders) {
          const { activities } = await orderService.getOrders({
            sortDirection: 'asc',
            types: (orderTypes?.length > 0
              ? orderTypes
              : undefined) as ActivityType[],
            userCurrency,
            userId
          });

          orderEntries = activities.map((a) => ({
            date: a.date,
            type: a.type,
            symbol: a.SymbolProfile?.symbol,
            name: a.SymbolProfile?.name,
            quantity: a.quantity,
            unitPrice: a.unitPrice,
            currency: a.currency,
            fee: a.fee,
            value: a.value,
            valueInBaseCurrency: a.valueInBaseCurrency,
            account: a.account?.name
          }));
        }

        // Fetch balance deltas if needed
        const cashEntries: typeof orderEntries = [];

        if (wantCash) {
          const [{ balances }, accounts] = await Promise.all([
            accountBalanceService.getAccountBalances({
              userCurrency,
              userId,
              withExcludedAccounts: false
            }),
            accountService.getAccounts(userId)
          ]);

          const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

          // Compute deltas per account
          const lastBalanceByAccount = new Map<string, number>();

          for (const b of balances) {
            const prev = lastBalanceByAccount.get(b.accountId);
            lastBalanceByAccount.set(b.accountId, b.valueInBaseCurrency);

            if (prev === undefined) {
              // First record — treat as initial deposit if > 0
              if (b.valueInBaseCurrency === 0) continue;
              const type = b.valueInBaseCurrency > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
              if (
                types &&
                !cashTypes.includes(type as (typeof CASH_TYPES)[number])
              )
                continue;

              cashEntries.push({
                date: b.date,
                type,
                value: Math.abs(b.valueInBaseCurrency),
                valueInBaseCurrency: Math.abs(b.valueInBaseCurrency),
                account: accountNameById.get(b.accountId)
              });
              continue;
            }

            const delta = b.valueInBaseCurrency - prev;
            if (delta === 0) continue;

            const type = delta > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
            if (
              types &&
              !cashTypes.includes(type as (typeof CASH_TYPES)[number])
            )
              continue;

            cashEntries.push({
              date: b.date,
              type,
              value: Math.abs(delta),
              valueInBaseCurrency: Math.abs(delta),
              account: accountNameById.get(b.accountId)
            });
          }
        }

        // Merge and sort
        const merged = [...orderEntries, ...cashEntries];
        merged.sort((a, b) => {
          const diff = a.date.getTime() - b.date.getTime();
          return sortDirection === 'asc' ? diff : -diff;
        });

        const sliced = merged.slice(0, take);

        return {
          count: merged.length,
          activities: sliced.map((e) => ({
            date: e.date,
            type: e.type,
            symbol: e.symbol,
            name: e.name,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            currency: e.currency,
            fee: e.fee,
            value: e.value,
            valueInBaseCurrency: e.valueInBaseCurrency,
            account: e.account
          }))
        };
      } catch (error) {
        return {
          error: `Failed to fetch transactions: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
