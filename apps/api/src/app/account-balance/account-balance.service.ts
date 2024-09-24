import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DATE_FORMAT, getSum, resetHours } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  Filter,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountBalance, Prisma } from '@prisma/client';
import { Big } from 'big.js';
import { format, parseISO } from 'date-fns';

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

  public async getAccountBalanceItems({
    filters,
    userCurrency,
    userId
  }: {
    filters?: Filter[];
    userCurrency: string;
    userId: string;
  }): Promise<HistoricalDataItem[]> {
    const { balances } = await this.getAccountBalances({
      filters,
      userCurrency,
      userId,
      withExcludedAccounts: false // TODO
    });
    const accumulatedBalancesByDate: { [date: string]: HistoricalDataItem } =
      {};
    const lastBalancesByAccount: { [accountId: string]: Big } = {};

    for (const { accountId, date, valueInBaseCurrency } of balances) {
      const formattedDate = format(date, DATE_FORMAT);

      lastBalancesByAccount[accountId] = new Big(valueInBaseCurrency);

      const totalBalance = getSum(Object.values(lastBalancesByAccount));

      // Add or update the accumulated balance for this date
      accumulatedBalancesByDate[formattedDate] = {
        date: formattedDate,
        value: totalBalance.toNumber()
      };
    }

    return Object.values(accumulatedBalancesByDate);
  }

  @LogPerformance
  public async getAccountBalances({
    filters,
    userCurrency,
    userId,
    withExcludedAccounts
  }: {
    filters?: Filter[];
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<AccountBalancesResponse> {
    const where: Prisma.AccountBalanceWhereInput = { userId };

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
          accountId: balance.Account.id,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            balance.value,
            balance.Account.currency,
            userCurrency
          )
        };
      })
    };
  }
}
