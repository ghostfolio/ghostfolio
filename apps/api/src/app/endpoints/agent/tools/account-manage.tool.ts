import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';

import { tool } from 'ai';
import { z } from 'zod';

import { warmPortfolioCache } from '../helpers/warm-portfolio-cache';

export function createAccountManageTool({
  accountService,
  approvedActions,
  portfolioSnapshotService,
  redisCacheService,
  userService,
  userId
}: {
  accountService: AccountService;
  approvedActions?: string[];
  portfolioSnapshotService: PortfolioSnapshotService;
  redisCacheService: RedisCacheService;
  userService: UserService;
  userId: string;
}) {
  return tool({
    description:
      'Manage investment accounts (brokerages, banks, wallets). Use this to create new accounts, update account details, delete empty accounts, transfer cash between accounts, or list all accounts with balances. IMPORTANT: Deposits and withdrawals are performed by updating the account balance (action: "update"). Do NOT use activity_manage for deposits or withdrawals — just set the new balance here and it will automatically be tracked in transaction_history.',
    needsApproval:
      process.env.SKIP_APPROVAL === 'true'
        ? false
        : (input) => {
            if (input.action === 'list') return false;
            const sig = `account_manage:${input.action}:${input.name ?? input.accountId ?? ''}`;
            return !approvedActions?.includes(sig);
          },
    inputSchema: z.object({
      action: z
        .enum(['create', 'update', 'delete', 'transfer', 'list'])
        .describe(
          "Action to perform. 'create': new account. 'update': modify existing. 'delete': remove empty account. 'transfer': move cash between accounts. 'list': show all accounts."
        ),
      name: z
        .string()
        .optional()
        .describe(
          "Account display name. Required for 'create'. E.g. 'Fidelity Brokerage', 'Coinbase'."
        ),
      currency: z
        .string()
        .optional()
        .describe(
          "Account base currency as ISO 4217 code (USD, EUR, GBP). Required for 'create'."
        ),
      balance: z
        .number()
        .min(0)
        .optional()
        .describe(
          "Cash balance. For 'create': initial balance (default 0). For 'update': sets new absolute balance (e.g. to withdraw $5k from $40k, set balance to 35000). For 'transfer': amount to move."
        ),
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Account ID. Required for 'update' and 'delete'. Get from 'list'."
        ),
      accountIdFrom: z
        .string()
        .uuid()
        .optional()
        .describe("Source account ID for 'transfer'. Get from 'list'."),
      accountIdTo: z
        .string()
        .uuid()
        .optional()
        .describe("Destination account ID for 'transfer'. Get from 'list'."),
      comment: z
        .string()
        .optional()
        .describe('Optional note about the account.'),
      isExcluded: z
        .boolean()
        .optional()
        .describe(
          'If true, exclude from portfolio calculations. Useful for test accounts.'
        )
    }),
    execute: async (input) => {
      try {
        switch (input.action) {
          case 'create': {
            const account = await accountService.createAccount(
              {
                balance: input.balance ?? 0,
                comment: input.comment,
                currency: input.currency,
                isExcluded: input.isExcluded ?? false,
                name: input.name,
                user: { connect: { id: userId } }
              },
              userId
            );

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return {
              id: account.id,
              name: account.name,
              currency: account.currency,
              balance: input.balance ?? 0
            };
          }

          case 'update': {
            const existing = await accountService.account({
              id_userId: { id: input.accountId, userId }
            });

            if (!existing) {
              return { error: 'Account not found or does not belong to you' };
            }

            const data: Record<string, any> = {
              id: input.accountId,
              user: { connect: { id: userId } }
            };

            if (input.name !== undefined) {
              data.name = input.name;
            }

            if (input.currency !== undefined) {
              data.currency = input.currency;
            }

            if (input.balance !== undefined) {
              data.balance = input.balance;
            }

            if (input.comment !== undefined) {
              data.comment = input.comment;
            }

            if (input.isExcluded !== undefined) {
              data.isExcluded = input.isExcluded;
            }

            if (existing.platformId) {
              data.platform = { connect: { id: existing.platformId } };
            }

            const account = await accountService.updateAccount(
              {
                data,
                where: {
                  id_userId: { id: input.accountId, userId }
                }
              },
              userId
            );

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return {
              id: account.id,
              name: account.name,
              currency: account.currency,
              balance: account.balance
            };
          }

          case 'delete': {
            const existing = await accountService.accountWithActivities(
              { id_userId: { id: input.accountId, userId } },
              { activities: true }
            );

            if (!existing) {
              return { error: 'Account not found or does not belong to you' };
            }

            if (existing.activities?.length > 0) {
              return {
                error: `Account "${existing.name}" has ${existing.activities.length} activities. Delete them first before deleting the account.`
              };
            }

            await accountService.deleteAccount({
              id_userId: { id: input.accountId, userId }
            });

            try {
              await warmPortfolioCache({
                portfolioSnapshotService,
                redisCacheService,
                userService,
                userId
              });
            } catch {}

            return { deleted: true, name: existing.name };
          }

          case 'transfer': {
            if (input.accountIdFrom === input.accountIdTo) {
              return { error: 'Cannot transfer to the same account' };
            }

            const accounts = await accountService.getAccounts(userId);
            const fromAccount = accounts.find(
              (a) => a.id === input.accountIdFrom
            );
            const toAccount = accounts.find((a) => a.id === input.accountIdTo);

            if (!fromAccount) {
              return { error: 'Source account not found' };
            }

            if (!toAccount) {
              return { error: 'Destination account not found' };
            }

            if (fromAccount.balance < input.balance) {
              return {
                error: `Insufficient balance. ${fromAccount.name} has ${fromAccount.currency} ${fromAccount.balance}, but tried to transfer ${input.balance}.`
              };
            }

            await accountService.updateAccountBalance({
              accountId: input.accountIdFrom,
              amount: -input.balance,
              currency: fromAccount.currency,
              userId
            });

            await accountService.updateAccountBalance({
              accountId: input.accountIdTo,
              amount: input.balance,
              currency: fromAccount.currency,
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
              from: fromAccount.name,
              to: toAccount.name,
              amount: input.balance,
              currency: fromAccount.currency
            };
          }

          case 'list': {
            const accounts = await accountService.getAccounts(userId);

            return accounts.map((a: any) => ({
              id: a.id,
              name: a.name,
              currency: a.currency,
              balance: a.balance,
              platform: a.platform?.name,
              isExcluded: a.isExcluded,
              activitiesCount: a.activitiesCount
            }));
          }
        }
      } catch (error) {
        return {
          error: `Failed to ${input.action} account: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
