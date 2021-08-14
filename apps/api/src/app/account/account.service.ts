import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Account, Currency, Order, Platform, Prisma } from '@prisma/client';

import { CashDetails } from './interfaces/cash-details.interface';

@Injectable()
export class AccountService {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async account(
    accountWhereUniqueInput: Prisma.AccountWhereUniqueInput
  ): Promise<Account | null> {
    return this.prismaService.account.findUnique({
      where: accountWhereUniqueInput
    });
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
    orderBy?: Prisma.AccountOrderByInput;
  }): Promise<
    (Account & {
      Order?: Order[];
      Platform?: Platform;
    })[]
  > {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prismaService.account.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async createAccount(
    data: Prisma.AccountCreateInput,
    aUserId: string
  ): Promise<Account> {
    return this.prismaService.account.create({
      data
    });
  }

  public async deleteAccount(
    where: Prisma.AccountWhereUniqueInput,
    aUserId: string
  ): Promise<Account> {
    return this.prismaService.account.delete({
      where
    });
  }

  public async getAccounts(aUserId: string) {
    const accounts = await this.accounts({
      include: { Order: true, Platform: true },
      orderBy: { name: 'asc' },
      where: { userId: aUserId }
    });

    return accounts.map((account) => {
      const result = { ...account, transactionCount: account.Order.length };

      delete result.Order;

      return result;
    });
  }

  public async getCashDetails(
    aUserId: string,
    aCurrency: Currency
  ): Promise<CashDetails> {
    let totalCashBalance = 0;

    const accounts = await this.accounts({
      where: { userId: aUserId }
    });

    accounts.forEach((account) => {
      totalCashBalance += this.exchangeRateDataService.toCurrency(
        account.balance,
        account.currency,
        aCurrency
      );
    });

    return { accounts, balance: totalCashBalance };
  }

  public async updateAccount(
    params: {
      where: Prisma.AccountWhereUniqueInput;
      data: Prisma.AccountUpdateInput;
    },
    aUserId: string
  ): Promise<Account> {
    const { data, where } = params;
    return this.prismaService.account.update({
      data,
      where
    });
  }
}
