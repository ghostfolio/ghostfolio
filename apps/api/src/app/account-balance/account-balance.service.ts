import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AccountBalancesResponse, Filter } from '@ghostfolio/common/interfaces';
import { UserWithSettings } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { AccountBalance, Prisma } from '@prisma/client';

@Injectable()
export class AccountBalanceService {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async accountBalance(
    accountBalanceWhereInput: Prisma.AccountBalanceWhereInput
  ): Promise<AccountBalance | null> {
    return this.prismaService.accountBalance.findFirst({
      include: {
        Account: true
      },
      where: accountBalanceWhereInput
    });
  }

  public async createAccountBalance(
    data: Prisma.AccountBalanceCreateInput
  ): Promise<AccountBalance> {
    return this.prismaService.accountBalance.create({
      data
    });
  }

  public async deleteAccountBalance(
    where: Prisma.AccountBalanceWhereUniqueInput
  ): Promise<AccountBalance> {
    return this.prismaService.accountBalance.delete({
      where
    });
  }

  public async getAccountBalances({
    filters,
    user,
    withExcludedAccounts
  }: {
    filters?: Filter[];
    user: UserWithSettings;
    withExcludedAccounts?: boolean;
  }): Promise<AccountBalancesResponse> {
    const where: Prisma.AccountBalanceWhereInput = { userId: user.id };

    const accountFilter = filters?.find(({ type }) => {
      return type === 'ACCOUNT';
    });

    if (accountFilter) {
      where.accountId = accountFilter.id;
    }

    if (withExcludedAccounts === false) {
      where.Account = { isExcluded: false };
    }

    const balances = await this.prismaService.accountBalance.findMany({
      where,
      orderBy: {
        date: 'asc'
      },
      select: {
        Account: true,
        date: true,
        id: true,
        value: true
      }
    });

    return {
      balances: balances.map((balance) => {
        return {
          ...balance,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            balance.value,
            balance.Account.currency,
            user.Settings.settings.baseCurrency
          )
        };
      })
    };
  }
}
