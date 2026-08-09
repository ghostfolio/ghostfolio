import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import {
  getWhereAccountBalanceNotInFuture,
  isAccountBalanceInFuture,
  WHERE_ACCOUNT_NOT_EXCLUDED
} from '@ghostfolio/api/helper/account.helper';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Filter } from '@ghostfolio/common/interfaces';
import { AccountWithBalance } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Account,
  AccountBalance,
  Order,
  Platform,
  Prisma,
  SymbolProfile,
  Tag
} from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, format } from 'date-fns';
import { groupBy, isNil } from 'lodash';

import { CashDetails } from './interfaces/cash-details.interface';

@Injectable()
export class AccountService {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly eventEmitter: EventEmitter2,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService,
    private readonly tagService: TagService
  ) {}

  public async account({
    id_userId
  }: Prisma.AccountWhereUniqueInput): Promise<AccountWithBalance | null> {
    const account = await this.prismaService.account.findUnique({
      include: {
        balances: {
          orderBy: { date: 'desc' },
          take: 1,
          // Ignore account balances in the future
          where: getWhereAccountBalanceNotInFuture()
        }
      },
      where: { id_userId }
    });

    if (!account) {
      return null;
    }

    const { balances, ...accountData } = account;

    return {
      ...accountData,
      balance: balances[0]?.value ?? 0
    };
  }

  public async accountWithActivities(
    accountWhereUniqueInput: Prisma.AccountWhereUniqueInput,
    accountInclude: Prisma.AccountInclude
  ): Promise<
    Account & {
      activities?: Order[];
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
    (AccountWithBalance & {
      activities?: (Order & {
        SymbolProfile?: SymbolProfile;
        tags?: Pick<Tag, 'id'>[];
      })[];
      balances?: AccountBalance[];
      platform?: Platform;
      tags?: Tag[];
    })[]
  > {
    const { include = {}, skip, take, cursor, where, orderBy } = params;

    const isBalancesIncluded = !!include.balances;
    const isTagsIncluded = !!include.tags;

    include.balances = {
      orderBy: { date: 'desc' },
      // If the balances are included, they are returned as-is (including the
      // ones in the future) because the client renders the full history. The
      // balance is derived below and skips the account balances in the future.
      ...(isBalancesIncluded
        ? {}
        : {
            take: 1,
            // Ignore account balances in the future
            where: getWhereAccountBalanceNotInFuture()
          })
    };

    if (isTagsIncluded) {
      include.tags = {
        include: {
          tag: true
        }
      };
    }

    const accounts = await this.prismaService.account.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });

    const endOfTodayDate = endOfToday();

    return accounts.map((account) => {
      const result = {
        ...account,
        balance:
          // The balances are ordered by date descending, hence the first account
          // balance which is not in the future reflects the current balance
          account.balances.find(({ date }) => {
            return !isAccountBalanceInFuture({ date, endOfTodayDate });
          })?.value ?? 0,
        tags: isTagsIncluded
          ? (account.tags as unknown as { tag: Tag }[]).map(({ tag }) => {
              return tag;
            })
          : undefined
      };

      if (!isBalancesIncluded) {
        delete result.balances;
      }

      if (!isTagsIncluded) {
        delete result.tags;
      }

      return result;
    });
  }

  public async createAccount({
    balance,
    data,
    tagIds,
    userId
  }: {
    balance?: number;
    data: Prisma.AccountCreateInput;
    tagIds?: string[];
    userId: string;
  }): Promise<Account> {
    await this.tagService.validateTagIdsWithoutDraftTag({ tagIds, userId });

    const account = await this.prismaService.account.create({
      data: {
        ...data,
        tags: tagIds
          ? {
              create: tagIds.map((tagId) => {
                return {
                  tag: { connect: { id: tagId } }
                };
              })
            }
          : undefined
      }
    });

    if (!isNil(balance)) {
      await this.accountBalanceService.createOrUpdateAccountBalance({
        balance,
        userId,
        accountId: account.id,
        date: format(new Date(), DATE_FORMAT)
      });
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: account.userId
      })
    );

    return account;
  }

  public async deleteAccount(
    where: Prisma.AccountWhereUniqueInput
  ): Promise<Account> {
    const account = await this.prismaService.account.delete({
      where
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: account.userId
      })
    );

    return account;
  }

  public async getAccounts(aUserId: string): Promise<AccountWithBalance[]> {
    const accounts = await this.accounts({
      include: {
        activities: true,
        platform: true,
        tags: true
      },
      orderBy: { name: 'asc' },
      where: { userId: aUserId }
    });

    return accounts.map((account) => {
      const result = {
        ...account,
        activitiesCount: account.activities.length
      };

      delete result.activities;

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
      where.AND = [WHERE_ACCOUNT_NOT_EXCLUDED];
    }

    const { ACCOUNT: filtersByAccount = [] } = groupBy(filters, ({ type }) => {
      return type;
    });

    if (filtersByAccount.length > 0) {
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

  public async updateAccount({
    balance,
    data,
    tagIds,
    userId,
    where
  }: {
    balance?: number;
    data: Prisma.AccountUpdateInput;
    tagIds?: string[];
    userId: string;
    where: Prisma.AccountWhereUniqueInput;
  }): Promise<Account> {
    await this.tagService.validateTagIdsWithoutDraftTag({ tagIds, userId });

    const account = await this.prismaService.account.update({
      data: {
        ...data,
        tags: tagIds
          ? {
              create: tagIds.map((tagId) => {
                return {
                  tag: { connect: { id: tagId } }
                };
              }),
              deleteMany: {}
            }
          : undefined
      },
      where
    });

    if (!isNil(balance)) {
      await this.accountBalanceService.createOrUpdateAccountBalance({
        balance,
        userId,
        accountId: account.id,
        date: format(new Date(), DATE_FORMAT)
      });
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: account.userId
      })
    );

    return account;
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
      await this.accountBalanceService.createOrUpdateAccountBalance({
        accountId,
        userId,
        balance: new Big(balance).plus(amountInCurrencyOfAccount).toNumber(),
        date: date.toISOString()
      });
    }
  }
}
