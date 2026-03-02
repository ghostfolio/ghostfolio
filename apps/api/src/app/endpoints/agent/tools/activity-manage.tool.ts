import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';

import type { DataSource, Type as ActivityType } from '@prisma/client';
import { tool } from 'ai';
import { parseISO } from 'date-fns';
import { z } from 'zod';

import { warmPortfolioCache } from '../helpers/warm-portfolio-cache';

/**
 * Auto-resolve a CoinGecko slug from a raw ticker symbol.
 * CoinGecko slugs are always lowercase (e.g. "bitcoin", "stacks").
 * If the symbol is already lowercase, assume it's a valid slug.
 */
async function resolveCoinGeckoSlug(
  dataProviderService: DataProviderService,
  user: any,
  symbol: string
): Promise<string> {
  if (symbol === symbol.toLowerCase()) {
    return symbol;
  }

  const { items } = await dataProviderService.search({ query: symbol, user });
  const match = items.find((item) => item.dataSource === 'COINGECKO');

  return match?.symbol ?? symbol.toLowerCase();
}

const CRYPTO_KEYWORDS = ['crypto', 'coin', 'wallet', 'defi', 'token'];
const STOCK_KEYWORDS = ['stock', 'brokerage', 'equity', 'equities'];
const ETF_KEYWORDS = ['etf', 'index', 'fund'];

function resolveAccount(
  accounts: { id: string; name: string; activitiesCount?: number }[],
  dataSource: string
): string | undefined {
  if (accounts.length === 0) return undefined;
  if (accounts.length === 1) return accounts[0].id;

  const keywords =
    dataSource === 'COINGECKO'
      ? CRYPTO_KEYWORDS
      : dataSource === 'YAHOO'
        ? [...STOCK_KEYWORDS, ...ETF_KEYWORDS]
        : [];

  if (keywords.length > 0) {
    const match = accounts.find((a) =>
      keywords.some((kw) => a.name.toLowerCase().includes(kw))
    );

    if (match) return match.id;
  }

  // Fallback: account with most activities
  const sorted = [...accounts].sort(
    (a, b) => (b.activitiesCount ?? 0) - (a.activitiesCount ?? 0)
  );

  return sorted[0].id;
}

export function createActivityManageTool({
  accountService,
  approvedActions,
  dataProviderService,
  orderService,
  portfolioSnapshotService,
  redisCacheService,
  userService,
  userId
}: {
  accountService: AccountService;
  approvedActions?: string[];
  dataProviderService: DataProviderService;
  orderService: OrderService;
  portfolioSnapshotService: PortfolioSnapshotService;
  redisCacheService: RedisCacheService;
  userService: UserService;
  userId: string;
}) {
  return tool({
    description:
      'Create, update, or delete portfolio transactions (activities). Supports BUY, SELL, DIVIDEND, FEE, INTEREST, and LIABILITY types.',
    needsApproval:
      process.env.SKIP_APPROVAL === 'true'
        ? false
        : (input) => {
            if (input.action !== 'create' && input.action !== 'delete')
              return false;
            const sig = `activity_manage:${input.action}:${input.symbol ?? ''}`;
            return !approvedActions?.includes(sig);
          },
    inputSchema: z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe(
          "Action to perform. 'create': record a new transaction. 'update': modify an existing one. 'delete': permanently remove."
        ),
      type: z
        .enum(['BUY', 'SELL', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY'])
        .optional()
        .describe(
          "Transaction type. Required for 'create'. BUY/SELL for trades. DIVIDEND for dividends. FEE for fees. INTEREST for interest income."
        ),
      symbol: z
        .string()
        .optional()
        .describe(
          "Asset ticker symbol. Required for 'create'. Stocks/ETFs: uppercase (AAPL). Crypto: ticker or CoinGecko slug — raw tickers (STX) are auto-resolved to slugs (stacks). FEE/INTEREST: descriptive name."
        ),
      date: z
        .string()
        .optional()
        .describe(
          "Transaction date as ISO 8601 string (e.g. '2026-02-26'). Required for 'create'."
        ),
      quantity: z
        .number()
        .min(0)
        .optional()
        .describe(
          "Number of shares/units. Required for 'create'. For FEE: use 1."
        ),
      unitPrice: z
        .number()
        .min(0)
        .optional()
        .describe(
          "Price per share/unit. Required for 'create'. For FEE: total fee amount (with quantity=1)."
        ),
      fee: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Transaction fee/commission. Default 0.'),
      currency: z
        .string()
        .optional()
        .describe(
          "Transaction currency as ISO 4217 code. Required for 'create'."
        ),
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe(
          'Account ID. Optional — if omitted, the best-matching account is auto-selected based on asset type.'
        ),
      dataSource: z
        .enum(['YAHOO', 'COINGECKO', 'MANUAL'])
        .optional()
        .default('YAHOO')
        .describe(
          'Data source. YAHOO for stocks/ETFs. COINGECKO for crypto. MANUAL for custom assets/fees.'
        ),
      comment: z
        .string()
        .optional()
        .describe("Optional note, e.g. 'Quarterly dividend'."),
      orderId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Transaction ID. Required for 'update' and 'delete'. Get from transaction_history."
        )
    }),
    execute: async (input) => {
      try {
        switch (input.action) {
          case 'create': {
            const user = await userService.user({ id: userId });

            // Auto-resolve CoinGecko slug from raw ticker (e.g. "STX" → "stacks")
            const symbol =
              input.dataSource === 'COINGECKO' && input.symbol
                ? await resolveCoinGeckoSlug(
                    dataProviderService,
                    user,
                    input.symbol
                  )
                : input.symbol;

            // Auto-resolve account if not provided
            let accountId = input.accountId;

            if (!accountId) {
              const accounts = await accountService.getAccounts(userId);
              accountId = resolveAccount(
                accounts.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  activitiesCount: a.activitiesCount
                })),
                input.dataSource
              );
            }

            // Validate activity
            await dataProviderService.validateActivities({
              activitiesDto: [
                {
                  currency: input.currency,
                  dataSource: input.dataSource as DataSource,
                  symbol,
                  type: input.type as ActivityType
                }
              ],
              maxActivitiesToImport: 1,
              user
            });

            const order = await orderService.createOrder({
              accountId,
              comment: input.comment,
              currency: input.currency,
              date: parseISO(input.date),
              fee: input.fee,
              quantity: input.quantity,
              SymbolProfile: {
                connectOrCreate: {
                  create: {
                    currency: input.currency,
                    dataSource: input.dataSource as DataSource,
                    symbol
                  },
                  where: {
                    dataSource_symbol: {
                      dataSource: input.dataSource as DataSource,
                      symbol
                    }
                  }
                }
              },
              type: input.type as ActivityType,
              unitPrice: input.unitPrice,
              user: { connect: { id: userId } },
              userId
            });

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return {
              id: order.id,
              type: input.type,
              symbol,
              date: input.date,
              quantity: input.quantity,
              unitPrice: input.unitPrice,
              fee: input.fee,
              currency: input.currency,
              accountId
            };
          }

          case 'update': {
            const originalOrder = await orderService.order({
              id: input.orderId
            });

            if (!originalOrder) {
              return { error: 'Transaction not found' };
            }

            if (originalOrder.userId !== userId) {
              return {
                error: 'Transaction does not belong to you'
              };
            }

            // Fetch current symbol profile for defaults
            const user = await userService.user({ id: userId });
            const userCurrency =
              user?.settings?.settings?.baseCurrency ?? 'USD';

            const { activities } = await orderService.getOrders({
              userCurrency,
              userId,
              includeDrafts: true,
              withExcludedAccountsAndActivities: true
            });

            const currentActivity = activities.find(
              (a) => a.id === input.orderId
            );

            if (!currentActivity) {
              return { error: 'Transaction not found' };
            }

            const newType = (input.type ??
              currentActivity.type) as ActivityType;
            const newSymbol =
              input.symbol ?? currentActivity.SymbolProfile?.symbol;
            const newDataSource = (input.dataSource ??
              currentActivity.SymbolProfile?.dataSource) as DataSource;
            const newDate = input.date
              ? parseISO(input.date)
              : currentActivity.date;
            const newAccountId = input.accountId ?? currentActivity.accountId;

            await orderService.updateOrder({
              data: {
                comment: input.comment ?? currentActivity.comment,
                currency: input.currency ?? currentActivity.currency,
                date: newDate,
                fee: input.fee ?? currentActivity.fee,
                quantity: input.quantity ?? currentActivity.quantity,
                type: newType,
                unitPrice: input.unitPrice ?? currentActivity.unitPrice,
                account: newAccountId
                  ? {
                      connect: {
                        id_userId: { id: newAccountId, userId }
                      }
                    }
                  : undefined,
                SymbolProfile: {
                  connect: {
                    dataSource_symbol: {
                      dataSource: newDataSource,
                      symbol: newSymbol
                    }
                  },
                  update: {
                    assetClass: undefined,
                    assetSubClass: undefined,
                    name: newSymbol
                  }
                },
                user: { connect: { id: userId } }
              },
              where: { id: input.orderId }
            });

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return {
              updated: true,
              id: input.orderId,
              type: newType,
              symbol: newSymbol,
              date: newDate
            };
          }

          case 'delete': {
            const order = await orderService.order({ id: input.orderId });

            if (!order) {
              return { error: 'Transaction not found' };
            }

            if (order.userId !== userId) {
              return {
                error: 'Transaction does not belong to you'
              };
            }

            const deletedOrder = await orderService.deleteOrder({
              id: input.orderId
            });

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return {
              deleted: true,
              type: deletedOrder.type,
              date: deletedOrder.date
            };
          }
        }
      } catch (error) {
        return {
          error: `Failed to ${input.action} activity: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
