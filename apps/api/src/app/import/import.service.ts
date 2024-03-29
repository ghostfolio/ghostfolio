import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import {
  Activity,
  ActivityError
} from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering/data-gathering.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import {
  AccountWithPlatform,
  OrderWithAccount,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { DataSource, Prisma, SymbolProfile } from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, format, isAfter, isSameSecond, parseISO } from 'date-fns';
import { uniqBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService,
    private readonly platformService: PlatformService,
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

        const date = parseDate(dateString);
        const isDuplicate = orders.some((activity) => {
          return (
            activity.accountId === Account?.id &&
            activity.SymbolProfile.currency === assetProfile.currency &&
            activity.SymbolProfile.dataSource === assetProfile.dataSource &&
            isSameSecond(activity.date, date) &&
            activity.quantity === quantity &&
            activity.SymbolProfile.symbol === assetProfile.symbol &&
            activity.type === 'DIVIDEND' &&
            activity.unitPrice === marketPrice
          );
        });

        const error: ActivityError = isDuplicate
          ? { code: 'IS_DUPLICATE' }
          : undefined;

        return {
          Account,
          date,
          error,
          quantity,
          value,
          accountId: Account?.id,
          accountUserId: undefined,
          comment: undefined,
          createdAt: undefined,
          fee: 0,
          feeInBaseCurrency: 0,
          id: assetProfile.id,
          isDraft: false,
          SymbolProfile: assetProfile,
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
    user
  }: {
    accountsDto: Partial<CreateAccountDto>[];
    activitiesDto: Partial<CreateOrderDto>[];
    isDryRun?: boolean;
    maxActivitiesToImport: number;
    user: UserWithSettings;
  }): Promise<Activity[]> {
    const accountIdMapping: { [oldAccountId: string]: string } = {};
    const userCurrency = user.Settings.settings.baseCurrency;

    if (!isDryRun && accountsDto?.length) {
      const [existingAccounts, existingPlatforms] = await Promise.all([
        this.accountService.accounts({
          where: {
            id: {
              in: accountsDto.map(({ id }) => {
                return id;
              })
            }
          }
        }),
        this.platformService.getPlatforms()
      ]);

      for (const account of accountsDto) {
        // Check if there is any existing account with the same ID
        const accountWithSameId = existingAccounts.find(
          (existingAccount) => existingAccount.id === account.id
        );

        // If there is no account or if the account belongs to a different user then create a new account
        if (!accountWithSameId || accountWithSameId.userId !== user.id) {
          let oldAccountId: string;
          const platformId = account.platformId;

          delete account.platformId;

          if (accountWithSameId) {
            oldAccountId = account.id;
            delete account.id;
          }

          let accountObject: Prisma.AccountCreateInput = {
            ...account,
            User: { connect: { id: user.id } }
          };

          if (
            existingPlatforms.some(({ id }) => {
              return id === platformId;
            })
          ) {
            accountObject = {
              ...accountObject,
              Platform: { connect: { id: platformId } }
            };
          }

          const newAccount = await this.accountService.createAccount(
            accountObject,
            user.id
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
        if (activity.type === 'ITEM' || activity.type === 'LIABILITY') {
          activity.dataSource = DataSource.MANUAL;
        } else {
          activity.dataSource =
            this.dataProviderService.getDataSourceForImport();
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
      user
    });

    const activitiesExtendedWithErrors = await this.extendActivitiesWithErrors({
      activitiesDto,
      userCurrency,
      userId: user.id
    });

    const accounts = (await this.accountService.getAccounts(user.id)).map(
      ({ id, name }) => {
        return { id, name };
      }
    );

    if (isDryRun) {
      accountsDto.forEach(({ id, name }) => {
        accounts.push({ id, name });
      });
    }

    const activities: Activity[] = [];

    for (let [
      index,
      {
        accountId,
        comment,
        date,
        error,
        fee,
        quantity,
        SymbolProfile,
        type,
        unitPrice
      }
    ] of activitiesExtendedWithErrors.entries()) {
      const assetProfile = assetProfiles[
        getAssetProfileIdentifier({
          dataSource: SymbolProfile.dataSource,
          symbol: SymbolProfile.symbol
        })
      ] ?? {
        currency: SymbolProfile.currency,
        dataSource: SymbolProfile.dataSource,
        symbol: SymbolProfile.symbol
      };
      const {
        assetClass,
        assetSubClass,
        countries,
        createdAt,
        currency,
        dataSource,
        figi,
        figiComposite,
        figiShareClass,
        id,
        isin,
        name,
        scraperConfiguration,
        sectors,
        symbol,
        symbolMapping,
        url,
        updatedAt
      } = assetProfile;
      const validatedAccount = accounts.find(({ id }) => {
        return id === accountId;
      });

      let order:
        | OrderWithAccount
        | (Omit<OrderWithAccount, 'Account'> & {
            Account?: { id: string; name: string };
          });

      if (SymbolProfile.currency !== assetProfile.currency) {
        // Convert the unit price and fee to the asset currency if the imported
        // activity is in a different currency
        unitPrice = await this.exchangeRateDataService.toCurrencyAtDate(
          unitPrice,
          SymbolProfile.currency,
          assetProfile.currency,
          date
        );

        if (!unitPrice) {
          throw new Error(
            `activities.${index} historical exchange rate at ${format(
              date,
              DATE_FORMAT
            )} is not available from "${SymbolProfile.currency}" to "${
              assetProfile.currency
            }"`
          );
        }

        fee = await this.exchangeRateDataService.toCurrencyAtDate(
          fee,
          SymbolProfile.currency,
          assetProfile.currency,
          date
        );
      }

      if (isDryRun) {
        order = {
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          accountId: validatedAccount?.id,
          accountUserId: undefined,
          createdAt: new Date(),
          id: uuidv4(),
          isDraft: isAfter(date, endOfToday()),
          SymbolProfile: {
            assetClass,
            assetSubClass,
            countries,
            createdAt,
            currency,
            dataSource,
            figi,
            figiComposite,
            figiShareClass,
            id,
            isin,
            name,
            scraperConfiguration,
            sectors,
            symbol,
            symbolMapping,
            updatedAt,
            url,
            comment: assetProfile.comment
          },
          Account: validatedAccount,
          symbolProfileId: undefined,
          updatedAt: new Date(),
          userId: user.id
        };
      } else {
        if (error) {
          continue;
        }

        order = await this.orderService.createOrder({
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
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
          updateAccountBalance: false,
          User: { connect: { id: user.id } },
          userId: user.id
        });
      }

      const value = new Big(quantity).mul(unitPrice).toNumber();

      activities.push({
        ...order,
        error,
        value,
        feeInBaseCurrency: this.exchangeRateDataService.toCurrency(
          fee,
          currency,
          userCurrency
        ),
        // @ts-ignore
        SymbolProfile: assetProfile,
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          value,
          currency,
          userCurrency
        )
      });
    }

    activities.sort((activity1, activity2) => {
      return Number(activity1.date) - Number(activity2.date);
    });

    if (!isDryRun) {
      // Gather symbol data in the background, if not dry run
      const uniqueActivities = uniqBy(activities, ({ SymbolProfile }) => {
        return getAssetProfileIdentifier({
          dataSource: SymbolProfile.dataSource,
          symbol: SymbolProfile.symbol
        });
      });

      this.dataGatheringService.gatherSymbols(
        uniqueActivities.map(({ date, SymbolProfile }) => {
          return {
            date,
            dataSource: SymbolProfile.dataSource,
            symbol: SymbolProfile.symbol
          };
        })
      );
    }

    return activities;
  }

  private async extendActivitiesWithErrors({
    activitiesDto,
    userCurrency,
    userId
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    userCurrency: string;
    userId: string;
  }): Promise<Partial<Activity>[]> {
    let { activities: existingActivities } = await this.orderService.getOrders({
      userCurrency,
      userId,
      includeDrafts: true,
      withExcludedAccounts: true
    });

    return activitiesDto.map(
      ({
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
      }) => {
        const date = parseISO(dateString);
        const isDuplicate = existingActivities.some((activity) => {
          return (
            activity.accountId === accountId &&
            activity.SymbolProfile.currency === currency &&
            activity.SymbolProfile.dataSource === dataSource &&
            isSameSecond(activity.date, date) &&
            activity.fee === fee &&
            activity.quantity === quantity &&
            activity.SymbolProfile.symbol === symbol &&
            activity.type === type &&
            activity.unitPrice === unitPrice
          );
        });

        const error: ActivityError = isDuplicate
          ? { code: 'IS_DUPLICATE' }
          : undefined;

        return {
          accountId,
          comment,
          date,
          error,
          fee,
          quantity,
          type,
          unitPrice,
          SymbolProfile: {
            currency,
            dataSource,
            symbol,
            activitiesCount: undefined,
            assetClass: undefined,
            assetSubClass: undefined,
            countries: undefined,
            createdAt: undefined,
            id: undefined,
            sectors: undefined,
            updatedAt: undefined
          }
        };
      }
    );
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
    user
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    maxActivitiesToImport: number;
    user: UserWithSettings;
  }) {
    if (activitiesDto?.length > maxActivitiesToImport) {
      throw new Error(`Too many activities (${maxActivitiesToImport} at most)`);
    }

    const assetProfiles: {
      [assetProfileIdentifier: string]: Partial<SymbolProfile>;
    } = {};

    for (const [
      index,
      { currency, dataSource, symbol, type }
    ] of activitiesDto.entries()) {
      if (!this.configurationService.get('DATA_SOURCES').includes(dataSource)) {
        throw new Error(
          `activities.${index}.dataSource ("${dataSource}") is not valid`
        );
      }

      if (
        this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
        user.subscription.type === 'Basic'
      ) {
        const dataProvider = this.dataProviderService.getDataProvider(
          DataSource[dataSource]
        );

        if (dataProvider.getDataProviderInfo().isPremium) {
          throw new Error(
            `activities.${index}.dataSource ("${dataSource}") is not valid`
          );
        }
      }

      if (!assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })]) {
        const assetProfile = {
          currency,
          ...(
            await this.dataProviderService.getAssetProfiles([
              { dataSource, symbol }
            ])
          )?.[symbol]
        };

        if (type === 'BUY' || type === 'DIVIDEND' || type === 'SELL') {
          if (!assetProfile?.name) {
            throw new Error(
              `activities.${index}.symbol ("${symbol}") is not valid for the specified data source ("${dataSource}")`
            );
          }

          if (assetProfile.currency !== currency) {
            throw new Error(
              `activities.${index}.currency ("${currency}") does not match with currency of ${assetProfile.symbol} ("${assetProfile.currency}")`
            );
          }
        }

        assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })] =
          assetProfile;
      }
    }

    return assetProfiles;
  }
}
