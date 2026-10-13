import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { parseDate, resetHours } from '@ghostfolio/common/helper';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Prisma, Type } from '@prisma/client';

import { ActivitiesService } from './activities.service';

describe('ActivitiesService cash balance lifecycle', () => {
  const date = parseDate('2024-01-01');
  const today = resetHours(new Date());
  const userId = 'user-id';
  const accountId = 'account-id';
  const where = { id: 'activity-id', userId };

  let balances: Balance[];
  let orders: ReturnType<typeof orderFixture>[];
  let service: ActivitiesService;
  let emit: jest.Mock;
  let getSymbolProfilesByIds: jest.Mock;
  let transaction: jest.Mock;
  let updateAccountBalance: jest.Mock;
  let transactionClient: {
    accountBalance: { updateMany: jest.Mock };
    order: {
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    orders = [orderFixture()];
    balances = [
      balanceFixture('2023-12-01', 1000),
      balanceFixture('2024-01-01', 698),
      balanceFixture('2024-02-01', 898),
      { accountId, userId, date: today, value: 1198 },
      balanceFixture('2024-01-01', 2000, 'other-account'),
      balanceFixture('2024-02-01', 2200, 'other-account'),
      { accountId: 'other-account', userId, date: today, value: 2500 },
      balanceFixture('2024-01-01', 3000, accountId, 'other-user')
    ];

    transactionClient = {
      accountBalance: {
        updateMany: jest.fn(async ({ data, where }) => {
          const matchingBalances = balances.filter((balance) => {
            return (
              balance.accountId === where.accountId &&
              balance.userId === where.userId &&
              balance.date >= where.date.gte
            );
          });

          matchingBalances.forEach((balance) => {
            balance.value += data.value.increment;
          });

          return { count: matchingBalances.length };
        })
      },
      order: {
        create: jest.fn(async ({ data }) => {
          const order = {
            ...orderFixture({ accountBalanceChange: null }),
            ...data,
            accountId: data.account?.connect?.id_userId.id ?? null,
            userId: data.user.connect.id,
            SymbolProfile: data.SymbolProfile.connectOrCreate.create
          };

          orders.push(order);

          return { ...order };
        }),
        delete: jest.fn(async ({ where }) => {
          const id = where.id ?? where.id_userId.id;
          const index = orders.findIndex((order) => order.id === id);
          const [deletedOrder] = orders.splice(index, 1);

          return deletedOrder;
        }),
        deleteMany: jest.fn(async ({ where }) => {
          const previousCount = orders.length;
          orders = orders.filter((order) => {
            return !(where.id?.in ?? []).includes(order.id);
          });

          return { count: previousCount - orders.length };
        }),
        findMany: jest.fn(async () => orders.map((order) => ({ ...order }))),
        findUnique: jest.fn(async ({ where }) => {
          const id = where.id ?? where.id_userId.id;
          const order = orders.find((order) => order.id === id);

          return { ...order, SymbolProfile: { ...order.SymbolProfile } };
        }),
        update: jest.fn(async ({ data, where }) => {
          const id = where.id ?? where.id_userId.id;
          const order = orders.find((order) => order.id === id);
          const { account, SymbolProfile, ...fields } = data;

          delete fields.tags;

          Object.assign(order, fields);

          if (account?.connect) {
            order.accountId = account.connect.id_userId.id;
          } else if (account?.disconnect) {
            order.accountId = null;
          }

          if (SymbolProfile?.update) {
            Object.assign(order.SymbolProfile, SymbolProfile.update);
          }

          return { ...order, SymbolProfile: { ...order.SymbolProfile } };
        })
      }
    };

    // Simulate commit and rollback while keeping the cash balance service a
    // boundary mock; its own tests verify historical lookup and chain updates.
    transaction = jest.fn(async (operation) => {
      const originalOrders = structuredClone(orders);
      const originalBalances = structuredClone(balances);

      try {
        return await operation(transactionClient);
      } catch (error) {
        orders = originalOrders;
        balances = originalBalances;

        throw error;
      }
    });

    updateAccountBalance = jest.fn(
      async ({ accountId: id, amount, date: activityDate, userId: owner }) => {
        const normalizedDate = resetHours(activityDate);
        const accountBalances = balances
          .filter((balance) => {
            return balance.accountId === id && balance.userId === owner;
          })
          .sort((left, right) => left.date.getTime() - right.date.getTime());
        const previousBalance = accountBalances
          .filter((balance) => balance.date <= normalizedDate)
          .at(-1);
        const sameDayBalance = accountBalances.find((balance) => {
          return balance.date.getTime() === normalizedDate.getTime();
        });

        if (!sameDayBalance) {
          balances.push({
            accountId: id,
            userId: owner,
            date: normalizedDate,
            value: (previousBalance?.value ?? 0) + amount
          });
        }

        accountBalances
          .filter((balance) => balance.date >= normalizedDate)
          .forEach((balance) => {
            balance.value += amount;
          });

        return amount;
      }
    );
    emit = jest.fn();
    getSymbolProfilesByIds = jest
      .fn()
      .mockResolvedValue([orderFixture().SymbolProfile]);

    service = new ActivitiesService(
      null,
      { updateAccountBalance } as unknown as AccountService,
      null,
      {
        getBenchmarkAssetProfiles: jest
          .fn()
          .mockResolvedValue([{ id: 'asset-profile-id' }])
      } as unknown as BenchmarkService,
      { gatherSymbols: jest.fn() } as unknown as DataGatheringService,
      null,
      { emit } as unknown as EventEmitter2,
      null,
      null,
      { $transaction: transaction } as unknown as PrismaService,
      { getSymbolProfilesByIds } as unknown as SymbolProfileService,
      { validateTagIds: jest.fn() } as unknown as TagService
    );
  });

  describe('create', () => {
    it('persists the cash balance preference and exact change together with the balance chain', async () => {
      await create(true);

      expect(orders[0].updateAccountBalance).toBe(true);
      expect(orders[0].accountBalanceChange).toBe(-302);
      expect(accountValues()).toEqual([1000, 396, 596, 896]);
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    });

    it('records disabled cash updates without changing balances', async () => {
      await create(false);

      expect(orders[0].updateAccountBalance).toBe(false);
      expect(orders[0].accountBalanceChange).toBeNull();
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(updateAccountBalance).not.toHaveBeenCalled();
    });

    it('retains the enabled preference without an account and applies cash when an account is attached later', async () => {
      await create(true, false);

      expect(orders[0].updateAccountBalance).toBe(true);
      expect(orders[0].accountBalanceChange).toBeNull();
      expect(updateAccountBalance).not.toHaveBeenCalled();

      await update({
        account: { connect: { id_userId: { id: accountId, userId } } }
      });

      expect(orders[0].accountBalanceChange).toBe(-302);
      expect(accountValues()).toEqual([1000, 396, 596, 896]);
    });

    it('rolls back creation and skips events when the cash chain update fails', async () => {
      updateAccountBalance.mockRejectedValue(new Error('Cash update failed'));

      await expect(create(true)).rejects.toThrow('Cash update failed');

      expect(orders).toEqual([]);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(emit).not.toHaveBeenCalled();
    });

    it('rolls back the applied balance chain when persisting the exact cash change fails', async () => {
      transactionClient.order.update.mockRejectedValue(
        new Error('Cash tracking failed')
      );

      await expect(create(true)).rejects.toThrow('Cash tracking failed');

      expect(updateAccountBalance).toHaveBeenCalledTimes(1);
      expect(orders).toEqual([]);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('edit', () => {
    it('reverses the original cash change and applies the new amount to every later balance', async () => {
      await update({ quantity: 4 });

      expect(accountValues()).toEqual([1000, 598, 798, 1098]);
      expect(accountValues('other-account')).toEqual([2000, 2200, 2500]);
      expect(balances.at(-1).value).toBe(3000);
      expect(orders[0].accountBalanceChange).toBe(-402);
      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledWith({
        data: { value: { increment: 302 } },
        where: { accountId, userId, date: { gte: resetHours(date) } }
      });
      expect(updateAccountBalance).toHaveBeenCalledWith({
        accountId,
        amount: -402,
        currency: 'USD',
        date,
        transaction: transactionClient,
        userId
      });
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    });

    it('moves a backdated cash change from its original date to its edited date', async () => {
      await update({ date: parseDate('2024-03-01') });

      expect(accountValues()).toEqual([1000, 1000, 1200, 898, 1198]);
      expect(orders[0].date).toEqual(parseDate('2024-03-01'));
    });

    it('restores the original account chain when a transaction moves to another account', async () => {
      await update({
        account: { connect: { id_userId: { id: 'other-account', userId } } }
      });

      expect(accountValues()).toEqual([1000, 1000, 1200, 1500]);
      expect(accountValues('other-account')).toEqual([1698, 1898, 2198]);
      expect(orders[0].accountBalanceChange).toBe(-302);
    });

    it.each([
      { fee: 12 },
      { unitPrice: 110 },
      { type: Type.SELL },
      { currency: 'EUR' }
    ])('reapplies cash when an economic field changes: %j', async (data) => {
      await update(data);

      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledTimes(
        1
      );
      expect(updateAccountBalance).toHaveBeenCalledTimes(1);
    });

    it('preserves the exact recorded cash change for a metadata-only edit without reconverting currency', async () => {
      orders[0].accountBalanceChange = -271.8;

      await update({ comment: 'Corrected note' });

      expect(orders[0].accountBalanceChange).toBe(-271.8);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(
        transactionClient.accountBalance.updateMany
      ).not.toHaveBeenCalled();
      expect(updateAccountBalance).not.toHaveBeenCalled();
    });

    it('reverses the recorded converted amount rather than recomputing the original amount with current exchange rates', async () => {
      orders[0].accountBalanceChange = -271.8;
      updateAccountBalance.mockResolvedValue(-321.6);

      await update({ quantity: 4 });

      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledWith({
        data: { value: { increment: 271.8 } },
        where: { accountId, userId, date: { gte: resetHours(date) } }
      });
      expect(orders[0].accountBalanceChange).toBe(-321.6);
    });

    it('leaves imported or previously untracked transactions out of the cash balance chain', async () => {
      orders[0].accountBalanceChange = null;
      orders[0].updateAccountBalance = false;

      await update({ quantity: 4 });

      expect(orders[0].accountBalanceChange).toBeNull();
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(
        transactionClient.accountBalance.updateMany
      ).not.toHaveBeenCalled();
      expect(updateAccountBalance).not.toHaveBeenCalled();
    });

    it('can opt an untracked transaction into cash balance updates', async () => {
      orders[0].accountBalanceChange = null;
      orders[0].updateAccountBalance = false;

      await update({ updateAccountBalance: true, quantity: 4 });

      expect(
        transactionClient.accountBalance.updateMany
      ).not.toHaveBeenCalled();
      expect(accountValues()).toEqual([1000, 296, 496, 796]);
      expect(orders[0].accountBalanceChange).toBe(-402);
      expect(orders[0].updateAccountBalance).toBe(true);
    });

    it('reverses and clears tracking when cash balance updates are explicitly disabled', async () => {
      await update({ updateAccountBalance: false });

      expect(accountValues()).toEqual([1000, 1000, 1200, 1500]);
      expect(orders[0].accountBalanceChange).toBeNull();
      expect(orders[0].updateAccountBalance).toBe(false);
      expect(updateAccountBalance).not.toHaveBeenCalled();
    });

    it('reverses and clears tracking when the transaction is detached from its account', async () => {
      await update({ account: { disconnect: true } });

      expect(accountValues()).toEqual([1000, 1000, 1200, 1500]);
      expect(orders[0].accountBalanceChange).toBeNull();
      expect(orders[0].updateAccountBalance).toBe(true);
      expect(updateAccountBalance).not.toHaveBeenCalled();
    });

    it('preserves tracking for a zero cash change so a later edit updates the chain', async () => {
      orders[0] = orderFixture({
        accountBalanceChange: 0,
        fee: 0,
        quantity: 0
      });

      await update({ quantity: 1 });

      expect(updateAccountBalance).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -100 })
      );
      expect(orders[0].accountBalanceChange).toBe(-100);
      expect(accountValues()).toEqual([1000, 598, 798, 1098]);
    });

    it('rolls back the activity edit and original balance reversal when applying the new cash change fails', async () => {
      updateAccountBalance.mockRejectedValue(new Error('Cash update failed'));

      await expect(update({ quantity: 4 })).rejects.toThrow(
        'Cash update failed'
      );

      expect(orders[0].quantity).toBe(3);
      expect(orders[0].accountBalanceChange).toBe(-302);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('reverses the original cash change through today when deleting a tracked transaction', async () => {
      await service.deleteActivity(where);

      expect(orders).toEqual([]);
      expect(accountValues()).toEqual([1000, 1000, 1200, 1500]);
      expect(accountValues('other-account')).toEqual([2000, 2200, 2500]);
      expect(updateAccountBalance).not.toHaveBeenCalled();
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    });

    it.each([null, 0])(
      'does not change balances when deleting a transaction with recorded cash change %s',
      async (accountBalanceChange) => {
        orders[0].accountBalanceChange = accountBalanceChange;

        await service.deleteActivity(where);

        expect(orders).toEqual([]);
        expect(accountValues()).toEqual([1000, 698, 898, 1198]);
        expect(
          transactionClient.accountBalance.updateMany
        ).not.toHaveBeenCalled();
        expect(updateAccountBalance).not.toHaveBeenCalled();
      }
    );

    it('rolls back deletion and skips cleanup and events when reversing the balance chain fails', async () => {
      transactionClient.accountBalance.updateMany.mockRejectedValue(
        new Error('Balance reversal failed')
      );

      await expect(service.deleteActivity(where)).rejects.toThrow(
        'Balance reversal failed'
      );

      expect(orders).toHaveLength(1);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(getSymbolProfilesByIds).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('bulk delete', () => {
    it('reverses every matching tracked transaction even when they share an asset profile', async () => {
      orders.push(
        orderFixture({
          accountBalanceChange: -100,
          date: parseDate('2024-02-01'),
          id: 'second-activity',
          quantity: 1,
          fee: 0
        }),
        orderFixture({
          accountBalanceChange: null,
          id: 'imported-activity',
          updateAccountBalance: false
        })
      );

      const result = await service.deleteActivities({ userId });

      expect(result).toBe(3);
      expect(orders).toEqual([]);
      expect(accountValues()).toEqual([1000, 1000, 1300, 1600]);
      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledTimes(
        2
      );
      expect(transactionClient.order.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['activity-id', 'second-activity', 'imported-activity'] },
          userId
        }
      });
      expect(getSymbolProfilesByIds).toHaveBeenCalledWith(['asset-profile-id']);
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 60000
      });
    });

    it('combines exact cash reversals for transactions from the same account and date', async () => {
      orders[0].accountBalanceChange = -0.1;
      orders.push(
        orderFixture({ accountBalanceChange: -0.2, id: 'second-activity' })
      );

      await service.deleteActivities({ userId });

      expect(orders).toEqual([]);
      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledTimes(
        1
      );
      expect(transactionClient.accountBalance.updateMany).toHaveBeenCalledWith({
        data: { value: { increment: 0.3 } },
        where: { accountId, userId, date: { gte: resetHours(date) } }
      });
      expect(accountValues()).toEqual([1000, 698.3, 898.3, 1198.3]);
    });

    it('rolls back the entire bulk delete when one balance reversal fails', async () => {
      orders.push(
        orderFixture({
          date: parseDate('2024-02-01'),
          id: 'second-activity'
        })
      );
      transactionClient.accountBalance.updateMany
        .mockImplementationOnce(
          transactionClient.accountBalance.updateMany.getMockImplementation()
        )
        .mockRejectedValueOnce(new Error('Balance reversal failed'));

      await expect(service.deleteActivities({ userId })).rejects.toThrow(
        'Balance reversal failed'
      );

      expect(orders).toHaveLength(2);
      expect(accountValues()).toEqual([1000, 698, 898, 1198]);
      expect(getSymbolProfilesByIds).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });
  });

  function update(
    data: Parameters<ActivitiesService['updateActivity']>[0]['data'] & {
      updateAccountBalance?: boolean;
    }
  ) {
    const original = orders[0];

    return service.updateActivity({
      data: {
        currency: original.currency,
        date: original.date,
        fee: original.fee,
        quantity: original.quantity,
        SymbolProfile: {
          connect: {
            dataSource_symbol: {
              dataSource: original.SymbolProfile.dataSource,
              symbol: original.SymbolProfile.symbol
            }
          },
          update: {
            currency: original.SymbolProfile.currency,
            name: original.SymbolProfile.symbol
          }
        },
        type: original.type,
        unitPrice: original.unitPrice,
        ...data
      },
      originalDate: original.date as Date,
      userId,
      where
    });
  }

  function create(updateAccountBalance: boolean, withAccount = true) {
    orders = [];

    return service.createActivity({
      accountId: withAccount ? accountId : undefined,
      currency: 'USD',
      date,
      fee: 2,
      quantity: 3,
      SymbolProfile: {
        connectOrCreate: {
          create: {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            symbol: 'Asset'
          },
          where: {
            dataSource_symbol: {
              dataSource: DataSource.MANUAL,
              symbol: 'Asset'
            }
          }
        }
      },
      type: Type.BUY,
      unitPrice: 100,
      updateAccountBalance,
      user: { connect: { id: userId } },
      userId
    });
  }

  function accountValues(id = accountId) {
    return balances
      .filter(
        (balance) => balance.accountId === id && balance.userId === userId
      )
      .sort((left, right) => left.date.getTime() - right.date.getTime())
      .map(({ value }) => value);
  }

  function balanceFixture(
    dateString: string,
    value: number,
    id = accountId,
    owner = userId
  ): Balance {
    return {
      value,
      accountId: id,
      userId: owner,
      date: resetHours(parseDate(dateString))
    };
  }

  function orderFixture(
    overrides: Partial<Prisma.OrderUncheckedCreateInput> = {}
  ) {
    return {
      accountBalanceChange: -302,
      accountId,
      accountUserId: userId,
      comment: null,
      createdAt: date,
      currency: 'USD',
      date,
      fee: 2,
      id: 'activity-id',
      quantity: 3,
      symbolProfileId: 'asset-profile-id',
      tags: [],
      type: Type.BUY,
      unitPrice: 100,
      updateAccountBalance: true,
      updatedAt: date,
      userId,
      ...overrides,
      SymbolProfile: {
        activitiesCount: 0,
        currency: 'USD',
        dataSource: DataSource.MANUAL,
        id: 'asset-profile-id',
        symbol: 'Asset',
        watchedByCount: 0
      }
    };
  }
});

interface Balance {
  accountId: string;
  date: Date;
  userId: string;
  value: number;
}
