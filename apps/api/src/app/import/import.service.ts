import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { parseDate } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import {
  AccountWithPlatform,
  OrderWithAccount
} from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import Big from 'big.js';
import { endOfToday, isAfter, isSameDay, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async getDividends({
    dataSource,
    symbol,
    userCurrency
  }: UniqueAsset & { userCurrency: string }): Promise<Activity[]> {
    try {
      const { firstBuyDate, historicalData, orders } =
        await this.portfolioService.getPosition(dataSource, undefined, symbol);

      const [[assetProfile], dividends] = await Promise.all([
        this.symbolProfileService.getSymbolProfiles([
          {
            dataSource,
            symbol
          }
        ]),
        await this.dataProviderService.getDividends({
          dataSource,
          symbol,
          from: parseDate(firstBuyDate),
          granularity: 'day',
          to: new Date()
        })
      ]);

      const accounts = orders.map((order) => {
        return order.Account;
      });

      const Account = this.isUniqueAccount(accounts) ? accounts[0] : undefined;

      return Object.entries(dividends).map(([dateString, { marketPrice }]) => {
        const quantity =
          historicalData.find((historicalDataItem) => {
            return historicalDataItem.date === dateString;
          })?.quantity ?? 0;

        const value = new Big(quantity).mul(marketPrice).toNumber();

        return {
          Account,
          quantity,
          value,
          accountId: Account?.id,
          accountUserId: undefined,
          comment: undefined,
          createdAt: undefined,
          date: parseDate(dateString),
          fee: 0,
          feeInBaseCurrency: 0,
          id: assetProfile.id,
          isDraft: false,
          SymbolProfile: <SymbolProfile>(<unknown>assetProfile),
          symbolProfileId: assetProfile.id,
          type: 'DIVIDEND',
          unitPrice: marketPrice,
          updatedAt: undefined,
          userId: Account?.userId,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            value,
            assetProfile.currency,
            userCurrency
          )
        };
      });
    } catch {
      return [];
    }
  }

  public async import({
    accountsDto,
    activitiesDto,
    isDryRun = false,
    maxActivitiesToImport,
    userCurrency,
    userId
  }: {
    accountsDto: Partial<CreateAccountDto>[];
    activitiesDto: Partial<CreateOrderDto>[];
    isDryRun?: boolean;
    maxActivitiesToImport: number;
    userCurrency: string;
    userId: string;
  }): Promise<Activity[]> {
    const accountIdMapping: { [oldAccountId: string]: string } = {};

    if (!isDryRun && accountsDto?.length) {
      const existingAccounts = await this.accountService.accounts({
        where: {
          id: {
            in: accountsDto.map(({ id }) => {
              return id;
            })
          }
        }
      });

      for (const account of accountsDto) {
        // Check if there is any existing account with the same ID
        const accountWithSameId = existingAccounts.find(
          (existingAccount) => existingAccount.id === account.id
        );

        // If there is no account or if the account belongs to a different user then create a new account
        if (!accountWithSameId || accountWithSameId.userId !== userId) {
          let oldAccountId: string;
          const platformId = account.platformId;

          delete account.platformId;

          if (accountWithSameId) {
            oldAccountId = account.id;
            delete account.id;
          }

          const newAccountObject = {
            ...account,
            User: { connect: { id: userId } }
          };

          if (platformId) {
            Object.assign(newAccountObject, {
              Platform: { connect: { id: platformId } }
            });
          }

          const newAccount = await this.accountService.createAccount(
            newAccountObject,
            userId
          );

          // Store the new to old account ID mappings for updating activities
          if (accountWithSameId && oldAccountId) {
            accountIdMapping[oldAccountId] = newAccount.id;
          }
        }
      }
    }

    for (const activity of activitiesDto) {
      if (!activity.dataSource) {
        if (activity.type === 'ITEM') {
          activity.dataSource = 'MANUAL';
        } else {
          activity.dataSource = this.dataProviderService.getPrimaryDataSource();
        }
      }

      // If a new account is created, then update the accountId in all activities
      if (!isDryRun) {
        if (Object.keys(accountIdMapping).includes(activity.accountId)) {
          activity.accountId = accountIdMapping[activity.accountId];
        }
      }
    }

    const assetProfiles = await this.validateActivities({
      activitiesDto,
      maxActivitiesToImport,
      userId
    });

    const accounts = (await this.accountService.getAccounts(userId)).map(
      (account) => {
        return { id: account.id, name: account.name };
      }
    );

    if (isDryRun) {
      accountsDto.forEach(({ id, name }) => {
        accounts.push({ id, name });
      });
    }

    const activities: Activity[] = [];

    for (const {
      accountId,
      comment,
      currency,
      dataSource,
      date: dateString,
      fee,
      quantity,
      symbol,
      type,
      unitPrice
    } of activitiesDto) {
      const date = parseISO(<string>(<unknown>dateString));
      const validatedAccount = accounts.find(({ id }) => {
        return id === accountId;
      });

      let order:
        | OrderWithAccount
        | (Omit<OrderWithAccount, 'Account'> & {
            Account?: { id: string; name: string };
          });

      if (isDryRun) {
        order = {
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          userId,
          accountId: validatedAccount?.id,
          accountUserId: undefined,
          createdAt: new Date(),
          id: uuidv4(),
          isDraft: isAfter(date, endOfToday()),
          SymbolProfile: {
            currency,
            dataSource,
            symbol,
            assetClass: null,
            assetSubClass: null,
            comment: null,
            countries: null,
            createdAt: undefined,
            id: undefined,
            name: null,
            scraperConfiguration: null,
            sectors: null,
            symbolMapping: null,
            updatedAt: undefined,
            url: null,
            ...assetProfiles[symbol]
          },
          Account: validatedAccount,
          symbolProfileId: undefined,
          updatedAt: new Date()
        };
      } else {
        order = await this.orderService.createOrder({
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          userId,
          accountId: validatedAccount?.id,
          SymbolProfile: {
            connectOrCreate: {
              create: {
                currency,
                dataSource,
                symbol
              },
              where: {
                dataSource_symbol: {
                  dataSource,
                  symbol
                }
              }
            }
          },
          User: { connect: { id: userId } }
        });
      }

      const value = new Big(quantity).mul(unitPrice).toNumber();

      //@ts-ignore
      activities.push({
        ...order,
        value,
        feeInBaseCurrency: this.exchangeRateDataService.toCurrency(
          fee,
          currency,
          userCurrency
        ),
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          value,
          currency,
          userCurrency
        )
      });
    }

    return activities;
  }

  private isUniqueAccount(accounts: AccountWithPlatform[]) {
    const uniqueAccountIds = new Set<string>();

    for (const account of accounts) {
      uniqueAccountIds.add(account.id);
    }

    return uniqueAccountIds.size === 1;
  }

  private async validateActivities({
    activitiesDto,
    maxActivitiesToImport,
    userId
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    maxActivitiesToImport: number;
    userId: string;
  }) {
    if (activitiesDto?.length > maxActivitiesToImport) {
      throw new Error(`Too many activities (${maxActivitiesToImport} at most)`);
    }

    const assetProfiles: {
      [symbol: string]: Partial<SymbolProfile>;
    } = {};
    const existingActivities = await this.orderService.orders({
      include: { SymbolProfile: true },
      orderBy: { date: 'desc' },
      where: { userId }
    });

    for (const [
      index,
      { currency, dataSource, date, fee, quantity, symbol, type, unitPrice }
    ] of activitiesDto.entries()) {
      const duplicateActivity = existingActivities.find((activity) => {
        return (
          activity.SymbolProfile.currency === currency &&
          activity.SymbolProfile.dataSource === dataSource &&
          isSameDay(activity.date, parseISO(<string>(<unknown>date))) &&
          activity.fee === fee &&
          activity.quantity === quantity &&
          activity.SymbolProfile.symbol === symbol &&
          activity.type === type &&
          activity.unitPrice === unitPrice
        );
      });

      if (duplicateActivity) {
        throw new Error(`activities.${index} is a duplicate activity`);
      }

      if (dataSource !== 'MANUAL') {
        const assetProfile = (
          await this.dataProviderService.getAssetProfiles([
            { dataSource, symbol }
          ])
        )?.[symbol];

        if (assetProfile === undefined) {
          throw new Error(
            `activities.${index}.symbol ("${symbol}") is not valid for the specified data source ("${dataSource}")`
          );
        }

        if (assetProfile.currency !== currency) {
          throw new Error(
            `activities.${index}.currency ("${currency}") does not match with "${assetProfile.currency}"`
          );
        }

        assetProfiles[symbol] = assetProfile;
      }
    }

    return assetProfiles;
  }
}
