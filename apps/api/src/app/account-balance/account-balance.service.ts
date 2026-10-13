import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import {
  isAccountBalanceInFuture,
  WHERE_ACCOUNT_NOT_EXCLUDED
} from '@ghostfolio/api/helper/account.helper';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { CreateAccountBalanceDto } from '@ghostfolio/common/dtos';
import {
  DATE_FORMAT,
  getStartOfUtcDateOfTomorrow,
  getSum,
  resetHours
} from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  Filter,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountBalance, Prisma } from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, format, min, parseISO } from 'date-fns';
import { groupBy } from 'lodash-es';

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
        account: true
      },
      where: accountBalanceWhereInput
    });
  }

  public async createOrUpdateAccountBalance({
    accountId,
    balance,
    balanceChange,
    date,
    transaction,
    userId
  }: CreateAccountBalanceDto & {
    balanceChange?: number;
    transaction?: Prisma.TransactionClient;
    userId: string;
  }): Promise<AccountBalance> {
    const balanceDate = resetHours(parseISO(date));
    const prisma = transaction ?? this.prismaService;
    const upsert = prisma.accountBalance.upsert({
      create: {
        account: {
          connect: {
            id_userId: {
              userId,
              id: accountId
            }
          }
        },
        date: balanceDate,
        value: balance
      },
      update: {
        value: balance
      },
      where: {
        accountId_date: {
          accountId,
          date: balanceDate
        }
      }
    });

    let accountBalance: AccountBalance;

    const updateLaterBalances = balanceChange
      ? prisma.accountBalance.updateMany({
          data: {
            value: { increment: balanceChange }
          },
          where: {
            accountId,
            userId,
            date: { gt: balanceDate }
          }
        })
      : undefined;

    if (transaction) {
      accountBalance = await upsert;

      if (updateLaterBalances !== undefined) {
        await updateLaterBalances;
      }
    } else if (updateLaterBalances !== undefined) {
      [accountBalance] = await this.prismaService.$transaction([
        upsert,
        updateLaterBalances
      ]);
    } else {
      accountBalance = await upsert;
    }

    if (!transaction) {
      this.eventEmitter.emit(
        PortfolioChangedEvent.getName(),
        new PortfolioChangedEvent({
          userId
        })
      );
    }

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
        userId: where.userId as string
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
    const endOfTodayDate = endOfToday();
    const startOfUtcDateOfTomorrow = getStartOfUtcDateOfTomorrow();

    for (const { accountId, date, valueInBaseCurrency } of balances) {
      if (isAccountBalanceInFuture({ date, startOfUtcDateOfTomorrow })) {
        continue;
      }

      // The date of a user in a time zone ahead of the instance can be after
      // the end date of the chart. Set the date back to today, so that the item
      // stays in the period of the calculation.
      const formattedDate = format(min([date, endOfTodayDate]), DATE_FORMAT);

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

    const { ACCOUNT: [filterByAccount] = [] } = groupBy(filters, ({ type }) => {
      return type;
    });

    if (filterByAccount) {
      where.accountId = filterByAccount.id;
    }

    if (withExcludedAccounts === false) {
      where.account = WHERE_ACCOUNT_NOT_EXCLUDED;
    }

    const balances = await this.prismaService.accountBalance.findMany({
      where,
      orderBy: {
        date: 'asc'
      },
      select: {
        account: true,
        date: true,
        id: true,
        value: true
      }
    });

    return {
      balances: balances.map((balance) => {
        return {
          ...balance,
          accountId: balance.account.id,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            balance.value,
            balance.account.currency ?? userCurrency,
            userCurrency
          )
        };
      })
    };
  }
}
