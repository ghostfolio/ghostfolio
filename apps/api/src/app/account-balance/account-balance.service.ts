import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { AccountBalancesResponse, Filter } from '@ghostfolio/common/interfaces';
import { UserWithSettings } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountBalance, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';

import { CreateAccountBalanceDto } from './create-account-balance.dto';

@Injectable()
export class AccountBalanceService {
  public constructor(
    private readonly eventEmitter: EventEmitter2,
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

  public async createOrUpdateAccountBalance({
    accountId,
    balance,
    date,
    userId
  }: CreateAccountBalanceDto & {
    userId: string;
  }): Promise<AccountBalance> {
    const accountBalance = await this.prismaService.accountBalance.upsert({
      create: {
        Account: {
          connect: {
            id_userId: {
              userId,
              id: accountId
            }
          }
        },
        date: resetHours(parseISO(date)),
        value: balance
      },
      update: {
        value: balance
      },
      where: {
        accountId_date: {
          accountId,
          date: resetHours(parseISO(date))
        }
      }
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId
      })
    );

    return accountBalance;
  }

  public async deleteAccountBalance(
    where: Prisma.AccountBalanceWhereUniqueInput
  ): Promise<AccountBalance> {
    const accountBalance = await this.prismaService.accountBalance.delete({
      where
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: <string>where.userId
      })
    );

    return accountBalance;
  }

  @LogPerformance
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
