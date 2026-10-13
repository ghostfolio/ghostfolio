import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountBalance, Prisma } from '@prisma/client';

import { AccountBalanceService } from './account-balance.service';

describe('AccountBalanceService', () => {
  let accountBalanceService: AccountBalanceService;
  let accountBalance: AccountBalance;
  let emit: jest.Mock;
  let transaction: jest.Mock;
  let updateMany: jest.Mock;
  let upsert: jest.Mock;

  const accountId = 'account-id';
  const userId = 'user-id';
  const normalizedDate = new Date('2024-01-15T00:00:00.000Z');
  const date = new Date(2024, 0, 15, 15, 20, 30).toISOString();

  beforeEach(() => {
    accountBalance = {
      accountId,
      userId,
      createdAt: normalizedDate,
      date: normalizedDate,
      id: 'balance-id',
      updatedAt: normalizedDate,
      value: 875
    };
    emit = jest.fn();
    upsert = jest.fn().mockResolvedValue(accountBalance);
    updateMany = jest.fn().mockResolvedValue({ count: 3 });
    transaction = jest.fn((operations: Promise<unknown>[]) => {
      return Promise.all(operations);
    });

    accountBalanceService = new AccountBalanceService(
      { emit } as unknown as EventEmitter2,
      null,
      {
        $transaction: transaction,
        accountBalance: { updateMany, upsert }
      } as unknown as PrismaService
    );
  });

  describe('createOrUpdateAccountBalance', () => {
    it.each([-125, 125])(
      'atomically applies a cash change of %s to later balances of the same account and user',
      async (balanceChange) => {
        const result = await updateBalance(balanceChange);

        expect(upsert).toHaveBeenCalledWith({
          create: {
            account: {
              connect: {
                id_userId: { id: accountId, userId }
              }
            },
            date: normalizedDate,
            value: 875
          },
          update: { value: 875 },
          where: {
            accountId_date: { accountId, date: normalizedDate }
          }
        });
        expect(updateMany).toHaveBeenCalledWith({
          data: { value: { increment: balanceChange } },
          where: {
            accountId,
            userId,
            date: { gt: normalizedDate }
          }
        });
        expect(transaction).toHaveBeenCalledTimes(1);
        expect(transaction).toHaveBeenCalledWith([
          upsert.mock.results[0].value,
          updateMany.mock.results[0].value
        ]);
        expect(result).toBe(accountBalance);
        expect(emit).toHaveBeenCalledTimes(1);
        expect(emit).toHaveBeenCalledWith(
          PortfolioChangedEvent.getName(),
          new PortfolioChangedEvent({ userId })
        );
      }
    );

    it.each([undefined, 0])(
      'preserves absolute balance edits without a cash change (%s)',
      async (balanceChange) => {
        const result = await updateBalance(balanceChange);

        expect(upsert).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              date: normalizedDate,
              value: 875
            }),
            update: { value: 875 }
          })
        );
        expect(updateMany).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
        expect(result).toBe(accountBalance);
        expect(emit).toHaveBeenCalledTimes(1);
      }
    );

    it('emits the portfolio change only after the entire balance chain transaction succeeds', async () => {
      let commit: (results: [AccountBalance, { count: number }]) => void;
      transaction.mockReturnValue(
        new Promise((resolve) => {
          commit = resolve;
        })
      );

      const pendingBalance = updateBalance(-125);

      await Promise.resolve();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(emit).not.toHaveBeenCalled();

      commit([accountBalance, { count: 3 }]);

      await expect(pendingBalance).resolves.toBe(accountBalance);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(
        PortfolioChangedEvent.getName(),
        new PortfolioChangedEvent({ userId })
      );
    });

    it('does not emit a portfolio change when the balance chain transaction fails', async () => {
      const error = new Error('Balance chain update failed');
      transaction.mockRejectedValue(error);

      await expect(updateBalance(-125)).rejects.toBe(error);

      expect(emit).not.toHaveBeenCalled();
    });

    it('does not emit a portfolio change when an absolute balance edit fails', async () => {
      const error = new Error('Balance update failed');
      upsert.mockRejectedValue(error);

      await expect(updateBalance()).rejects.toBe(error);

      expect(emit).not.toHaveBeenCalled();
    });

    it.each([-125, 125, undefined, 0])(
      'uses the supplied transaction for a cash change of %s without opening another transaction or emitting before commit',
      async (balanceChange) => {
        const transactionUpsert = jest.fn().mockResolvedValue(accountBalance);
        const transactionUpdateMany = jest.fn().mockResolvedValue({ count: 3 });
        const transactionClient = {
          accountBalance: {
            updateMany: transactionUpdateMany,
            upsert: transactionUpsert
          }
        } as unknown as Prisma.TransactionClient;

        const result = await updateBalance(balanceChange, transactionClient);

        expect(transactionUpsert).toHaveBeenCalledWith({
          create: {
            account: { connect: { id_userId: { id: accountId, userId } } },
            date: normalizedDate,
            value: 875
          },
          update: { value: 875 },
          where: { accountId_date: { accountId, date: normalizedDate } }
        });

        if (balanceChange) {
          expect(transactionUpdateMany).toHaveBeenCalledWith({
            data: { value: { increment: balanceChange } },
            where: { accountId, userId, date: { gt: normalizedDate } }
          });
        } else {
          expect(transactionUpdateMany).not.toHaveBeenCalled();
        }

        expect(upsert).not.toHaveBeenCalled();
        expect(updateMany).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
        expect(result).toBe(accountBalance);
      }
    );

    it('waits for later balances to update inside the supplied transaction', async () => {
      let finishUpdate: (result: { count: number }) => void;
      const transactionClient = {
        accountBalance: {
          upsert: jest.fn().mockResolvedValue(accountBalance),
          updateMany: jest.fn().mockReturnValue(
            new Promise((resolve) => {
              finishUpdate = resolve;
            })
          )
        }
      } as unknown as Prisma.TransactionClient;
      const onResolved = jest.fn();
      const pendingBalance = updateBalance(-125, transactionClient).then(
        onResolved
      );

      await Promise.resolve();
      await Promise.resolve();

      expect(onResolved).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();

      finishUpdate({ count: 3 });
      await pendingBalance;

      expect(onResolved).toHaveBeenCalledWith(accountBalance);
      expect(transaction).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });

    it.each(['upsert', 'updateMany'])(
      'propagates a failed %s from the supplied transaction without emitting a portfolio change',
      async (operation) => {
        const error = new Error('Balance chain update failed');
        const accountBalanceClient = {
          upsert: jest.fn().mockResolvedValue(accountBalance),
          updateMany: jest.fn().mockResolvedValue({ count: 3 })
        };
        accountBalanceClient[operation].mockRejectedValue(error);
        const transactionClient = {
          accountBalance: accountBalanceClient
        } as unknown as Prisma.TransactionClient;

        await expect(updateBalance(-125, transactionClient)).rejects.toBe(
          error
        );

        expect(upsert).not.toHaveBeenCalled();
        expect(updateMany).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
      }
    );
  });

  function updateBalance(
    balanceChange?: number,
    transactionClient?: Prisma.TransactionClient
  ) {
    return accountBalanceService.createOrUpdateAccountBalance({
      accountId,
      balanceChange,
      date,
      userId,
      balance: 875,
      transaction: transactionClient
    });
  }
});
