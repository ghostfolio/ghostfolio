import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Filter } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { Account, Order, Platform, Prisma } from '@prisma/client';
import Big from 'big.js';
import { groupBy } from 'lodash';

import { CashDetails } from './interfaces/cash-details.interface';

@Injectable()
export class AccountService {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async account({
    id_userId
  }: Prisma.AccountWhereUniqueInput): Promise<Account | null> {
    const { id, userId } = id_userId;

    const [account] = await this.accounts({
      where: { id, userId }
    });

    return account;
  }

  public async accountWithOrders(
    accountWhereUniqueInput: Prisma.AccountWhereUniqueInput,
    accountInclude: Prisma.AccountInclude
  ): Promise<
    Account & {
      Order?: Order[];
    }
  > {
    return this.prismaService.account.findUnique({
      include: accountInclude,
      where: accountWhereUniqueInput
    });
  }

  public async accounts(params: {
    include?: Prisma.AccountInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.AccountWhereUniqueInput;
    where?: Prisma.AccountWhereInput;
    orderBy?: Prisma.AccountOrderByWithRelationInput;
  }): Promise<
    (Account & {
      Order?: Order[];
      Platform?: Platform;
    })[]
  > {
    const { include = {}, skip, take, cursor, where, orderBy } = params;

    include.balances = { orderBy: { date: 'desc' }, take: 1 };

    const accounts = await this.prismaService.account.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });

    return accounts.map((account) => {
      account = { ...account, balance: account.balances[0]?.value ?? 0 };

      delete account.balances;

      return account;
    });
  }

  public async createAccount(
    data: Prisma.AccountCreateInput,
    aUserId: string
  ): Promise<Account> {
    const account = await this.prismaService.account.create({
      data
    });

    await this.prismaService.accountBalance.create({
      data: {
        Account: {
          connect: {
            id_userId: { id: account.id, userId: aUserId }
          }
        },
        value: data.balance
      }
    });

    return account;
  }

  public async deleteAccount(
    where: Prisma.AccountWhereUniqueInput,
    aUserId: string
  ): Promise<Account> {
    return this.prismaService.account.delete({
      where
    });
  }

  public async getAccounts(aUserId: string): Promise<Account[]> {
    const accounts = await this.accounts({
      include: { Order: true, Platform: true },
      orderBy: { name: 'asc' },
      where: { userId: aUserId }
    });

    return accounts.map((account) => {
      let transactionCount = 0;

      for (const order of account.Order) {
        if (!order.isDraft) {
          transactionCount += 1;
        }
      }

      const result = { ...account, transactionCount };

      delete result.Order;

      return result;
    });
  }

  public async getCashDetails({
    currency,
    filters = [],
    userId,
    withExcludedAccounts = false
  }: {
    currency: string;
    filters?: Filter[];
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<CashDetails> {
    let totalCashBalanceInBaseCurrency = new Big(0);

    const where: Prisma.AccountWhereInput = {
      userId
    };

    if (withExcludedAccounts === false) {
      where.isExcluded = false;
    }

    const {
      ACCOUNT: filtersByAccount,
      ASSET_CLASS: filtersByAssetClass,
      TAG: filtersByTag
    } = groupBy(filters, (filter) => {
      return filter.type;
    });

    if (filtersByAccount?.length > 0) {
      where.id = {
        in: filtersByAccount.map(({ id }) => {
          return id;
        })
      };
    }

    const accounts = await this.accounts({ where });

    for (const account of accounts) {
      totalCashBalanceInBaseCurrency = totalCashBalanceInBaseCurrency.plus(
        this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          currency
        )
      );
    }

    return {
      accounts,
      balanceInBaseCurrency: totalCashBalanceInBaseCurrency.toNumber()
    };
  }

  public async updateAccount(
    params: {
      where: Prisma.AccountWhereUniqueInput;
      data: Prisma.AccountUpdateInput;
    },
    aUserId: string
  ): Promise<Account> {
    const { data, where } = params;

    await this.prismaService.accountBalance.create({
      data: {
        Account: {
          connect: {
            id_userId: where.id_userId
          }
        },
        value: <number>data.balance
      }
    });

    return this.prismaService.account.update({
      data,
      where
    });
  }

  public async updateAccountBalance({
    accountId,
    amount,
    currency,
    date = new Date(),
    userId
  }: {
    accountId: string;
    amount: number;
    currency: string;
    date?: Date;
    userId: string;
  }) {
    const { balance, currency: currencyOfAccount } = await this.account({
      id_userId: {
        userId,
        id: accountId
      }
    });

    const amountInCurrencyOfAccount =
      await this.exchangeRateDataService.toCurrencyAtDate(
        amount,
        currency,
        currencyOfAccount,
        date
      );

    if (amountInCurrencyOfAccount) {
      await this.accountBalanceService.createAccountBalance({
        date,
        Account: {
          connect: {
            id_userId: {
              userId,
              id: accountId
            }
          }
        },
        value: new Big(balance).plus(amountInCurrencyOfAccount).toNumber()
      });
    }
  }
}
