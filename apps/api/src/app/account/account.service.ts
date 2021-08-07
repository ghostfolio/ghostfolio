import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Account, Currency, Order, Prisma } from '@prisma/client';

import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { CashDetails } from './interfaces/cash-details.interface';

@Injectable()
export class AccountService {
  public constructor(
    private exchangeRateDataService: ExchangeRateDataService,
    private readonly redisCacheService: RedisCacheService,
    private prisma: PrismaService
  ) {}

  public async account(
    accountWhereUniqueInput: Prisma.AccountWhereUniqueInput
  ): Promise<Account | null> {
    return this.prisma.account.findUnique({
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
    return this.prisma.account.findUnique({
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
  }): Promise<Account[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prisma.account.findMany({
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
    return this.prisma.account.create({
      data
    });
  }

  public async deleteAccount(
    where: Prisma.AccountWhereUniqueInput,
    aUserId: string
  ): Promise<Account> {
    return this.prisma.account.delete({
      where
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
    return this.prisma.account.update({
      data,
      where
    });
  }
}
