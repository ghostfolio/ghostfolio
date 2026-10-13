import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';

import { BadRequestException } from '@nestjs/common';
import { AccountBalance, Prisma } from '@prisma/client';

import { AccountService } from './account.service';

describe('AccountService', () => {
  let accountService: AccountService;
  let balances: (Pick<AccountBalance, 'date' | 'value'> &
    Partial<Pick<AccountBalance, 'accountId' | 'userId'>>)[];
  let createOrUpdateAccountBalance: jest.Mock;
  let findUnique: jest.Mock;
  let toCurrencyAtDate: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    balances = [];

    createOrUpdateAccountBalance = jest.fn(
      ({
        accountId,
        balance,
        balanceChange = 0,
        date,
        userId
      }: Parameters<
        AccountBalanceService['createOrUpdateAccountBalance']
      >[0]) => {
        const balanceDate = resetHours(new Date(date));
        const accountBalances = balances.filter((snapshot) => {
          return (
            (snapshot.accountId ?? 'account-id') === accountId &&
            (snapshot.userId ?? 'user-id') === userId
          );
        });
        const existingBalance = accountBalances.find(
          ({ date: snapshotDate }) => {
            return snapshotDate.getTime() === balanceDate.getTime();
          }
        );

        if (existingBalance) {
          existingBalance.value = balance;
        } else {
          balances.push({ date: balanceDate, value: balance });
        }

        accountBalances.forEach((snapshot) => {
          if (snapshot.date > balanceDate) {
            snapshot.value += balanceChange;
          }
        });
      }
    );
    toCurrencyAtDate = jest.fn((amount: number) => {
      return Promise.resolve(amount);
    });

    findUnique = jest.fn(
      ({ include, where: accountWhere }: Prisma.AccountFindUniqueArgs) => {
        const { orderBy, take, where } = include.balances as {
          orderBy: { date: 'asc' | 'desc' };
          take: number;
          where: { date: { lte: Date } };
        };

        return {
          currency: 'EUR',
          id: 'account-id',
          userId: 'user-id',
          balances: balances
            .filter(
              ({ accountId = 'account-id', date, userId = 'user-id' }) => {
                return (
                  accountId === accountWhere.id_userId.id &&
                  userId === accountWhere.id_userId.userId &&
                  date <= where.date.lte
                );
              }
            )
            .sort((a, b) => {
              return orderBy.date === 'desc'
                ? b.date.getTime() - a.date.getTime()
                : a.date.getTime() - b.date.getTime();
            })
            .slice(0, take)
        };
      }
    );

    accountService = new AccountService(
      { createOrUpdateAccountBalance } as unknown as AccountBalanceService,
      null,
      { toCurrencyAtDate } as unknown as ExchangeRateDataService,
      { account: { findUnique } } as unknown as PrismaService,
      null
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('updateAccountBalance', () => {
    it('debits the historical balance and every later snapshot for that account, including today', async () => {
      balances = [
        { date: new Date('2024-01-01'), value: 1000 },
        { date: new Date('2024-06-01'), value: 5000 },
        { date: new Date('2024-06-15'), value: 6000 },
        { date: new Date('2024-07-01'), value: 9000 },
        {
          accountId: 'other-account-id',
          date: new Date('2024-06-01'),
          value: 2000
        },
        {
          date: new Date('2024-06-01'),
          userId: 'other-user-id',
          value: 3000
        }
      ];
      const date = new Date(2024, 0, 15, 15);

      await updateBalance({ amount: -125, date });

      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith({
        accountId: 'account-id',
        balance: 875,
        balanceChange: -125,
        date: date.toISOString(),
        userId: 'user-id'
      });
      expect(balances).toContainEqual({
        date: new Date('2024-01-01'),
        value: 1000
      });
      expect(balances).toContainEqual({
        date: new Date('2024-06-01'),
        value: 4875
      });
      expect(balances).toContainEqual({
        date: new Date('2024-06-15'),
        value: 5875
      });
      expect(balances).toContainEqual({
        date: new Date('2024-07-01'),
        value: 8875
      });
      expect(balances).toContainEqual({
        accountId: 'other-account-id',
        date: new Date('2024-06-01'),
        value: 2000
      });
      expect(balances).toContainEqual({
        date: new Date('2024-06-01'),
        userId: 'other-user-id',
        value: 3000
      });

      const account = await accountService.account({
        id_userId: { id: 'account-id', userId: 'user-id' }
      });

      expect(account.balance).toBe(5875);
    });

    it('includes the existing snapshot on the transaction date and accumulates repeated debits', async () => {
      balances = [
        { date: new Date('2024-01-01'), value: 1000 },
        { date: new Date('2024-01-15'), value: 900 },
        { date: new Date('2024-01-16'), value: 1500 },
        { date: new Date('2024-06-01'), value: 5000 }
      ];

      await updateBalance({
        amount: -100,
        date: new Date(2024, 0, 15, 15)
      });
      await updateBalance({
        amount: -50,
        date: new Date(2024, 0, 15, 20)
      });

      expect(createOrUpdateAccountBalance).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ balance: 800, balanceChange: -100 })
      );
      expect(createOrUpdateAccountBalance).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ balance: 750, balanceChange: -50 })
      );
      expect(balances).toContainEqual({
        date: new Date('2024-01-01'),
        value: 1000
      });
      expect(balances).toContainEqual({
        date: new Date('2024-01-15'),
        value: 750
      });
      expect(balances).toContainEqual({
        date: new Date('2024-01-16'),
        value: 1350
      });
      expect(balances).toContainEqual({
        date: new Date('2024-06-01'),
        value: 4850
      });
    });

    it('starts from zero when no balance exists on or before the transaction date', async () => {
      balances = [{ date: new Date('2024-01-10'), value: 1000 }];

      await updateBalance({ amount: -100, date: new Date('2024-01-05') });

      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith(
        expect.objectContaining({ balance: -100, balanceChange: -100 })
      );
      expect(balances).toContainEqual({
        date: new Date('2024-01-10'),
        value: 900
      });
    });

    it('uses the converted transaction amount for the historical balance and all later snapshots', async () => {
      balances = [
        { date: new Date('2024-01-01'), value: 1000 },
        { date: new Date('2024-06-01'), value: 5000 }
      ];
      const date = new Date(2024, 0, 15, 18);
      toCurrencyAtDate.mockResolvedValue(-90);

      const amountInCurrencyOfAccount = await updateBalance({
        amount: -100,
        currency: 'USD',
        date
      });

      expect(amountInCurrencyOfAccount).toBe(-90);
      expect(toCurrencyAtDate).toHaveBeenCalledWith(-100, 'USD', 'EUR', date);
      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 910, balanceChange: -90 })
      );
      expect(balances).toContainEqual({
        date: new Date('2024-06-01'),
        value: 4910
      });
    });

    it('credits the historical balance and all later snapshots', async () => {
      balances = [
        { date: new Date('2024-01-01'), value: 1000 },
        { date: new Date('2024-06-01'), value: 5000 }
      ];

      await updateBalance({ amount: 125, date: new Date('2024-01-15') });

      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 1125, balanceChange: 125 })
      );
      expect(balances).toContainEqual({
        date: new Date('2024-01-01'),
        value: 1000
      });
      expect(balances).toContainEqual({
        date: new Date('2024-06-01'),
        value: 5125
      });
    });

    it('uses the current balance cutoff when the transaction date is omitted', async () => {
      balances = [
        { date: new Date('2024-06-15'), value: 1000 },
        { date: new Date('2024-06-16'), value: 2000 },
        { date: new Date('2024-06-17'), value: 3000 }
      ];

      await updateBalance({ amount: -100 });

      expect(toCurrencyAtDate).toHaveBeenCalledWith(
        -100,
        'EUR',
        'EUR',
        new Date()
      );
      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith({
        accountId: 'account-id',
        balance: 1900,
        balanceChange: -100,
        date: new Date().toISOString(),
        userId: 'user-id'
      });
    });

    it('reads the historical balance and writes the converted cash change using the supplied transaction', async () => {
      balances = [{ date: new Date('2024-01-01'), value: 1000 }];
      const date = new Date(2024, 0, 15, 15);
      const transactionFindUnique = jest.fn().mockResolvedValue({
        currency: 'EUR',
        id: 'account-id',
        userId: 'user-id',
        balances: [{ date: new Date('2024-01-01'), value: 700 }]
      });
      const transaction = {
        account: { findUnique: transactionFindUnique }
      } as unknown as Prisma.TransactionClient;
      toCurrencyAtDate.mockResolvedValue(-91.125);

      const amountInCurrencyOfAccount = await updateBalance({
        date,
        transaction,
        amount: -100,
        currency: 'USD'
      });

      expect(amountInCurrencyOfAccount).toBe(-91.125);
      expect(transactionFindUnique).toHaveBeenCalledWith({
        include: {
          balances: {
            orderBy: { date: 'desc' },
            take: 1,
            where: { date: { lte: resetHours(date) } }
          }
        },
        where: { id_userId: { id: 'account-id', userId: 'user-id' } }
      });
      expect(findUnique).not.toHaveBeenCalled();
      expect(toCurrencyAtDate).toHaveBeenCalledWith(-100, 'USD', 'EUR', date);
      expect(createOrUpdateAccountBalance).toHaveBeenCalledWith({
        transaction,
        accountId: 'account-id',
        balance: 608.875,
        balanceChange: -91.125,
        date: date.toISOString(),
        userId: 'user-id'
      });
    });

    it.each([undefined, NaN, Infinity, -Infinity])(
      'rejects an invalid currency conversion (%s) before writing any balance',
      async (amountInCurrencyOfAccount) => {
        balances = [{ date: new Date('2024-01-01'), value: 1000 }];
        toCurrencyAtDate.mockResolvedValue(amountInCurrencyOfAccount);

        await expect(
          updateBalance({
            amount: -100,
            currency: 'USD',
            date: new Date('2024-01-15')
          })
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(createOrUpdateAccountBalance).not.toHaveBeenCalled();
        expect(balances).toEqual([
          { date: new Date('2024-01-01'), value: 1000 }
        ]);
      }
    );

    it('returns zero without writing balances when the converted cash change is zero', async () => {
      balances = [{ date: new Date('2024-01-01'), value: 1000 }];
      toCurrencyAtDate.mockResolvedValue(0);

      await expect(
        updateBalance({ amount: 0, date: new Date('2024-01-15') })
      ).resolves.toBe(0);

      expect(createOrUpdateAccountBalance).not.toHaveBeenCalled();
      expect(balances).toEqual([{ date: new Date('2024-01-01'), value: 1000 }]);
    });
  });

  describe('account', () => {
    it('returns the current balance and excludes future balances when no date is specified', async () => {
      balances = [
        { date: new Date('2024-01-01'), value: 1000 },
        { date: new Date('2024-06-01'), value: 5000 },
        { date: new Date('2024-07-01'), value: 9000 }
      ];

      const account = await accountService.account({
        id_userId: { id: 'account-id', userId: 'user-id' }
      });

      expect(account.balance).toBe(5000);
    });
  });

  async function updateBalance({
    amount,
    currency = 'EUR',
    date,
    transaction
  }: {
    amount: number;
    currency?: string;
    date?: Date;
    transaction?: Prisma.TransactionClient;
  }) {
    return accountService.updateAccountBalance({
      amount,
      currency,
      date,
      transaction,
      accountId: 'account-id',
      userId: 'user-id'
    });
  }
});
