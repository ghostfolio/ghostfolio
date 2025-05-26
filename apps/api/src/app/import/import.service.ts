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
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { DATA_GATHERING_QUEUE_PRIORITY_HIGH } from '@ghostfolio/common/config';
import {
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  AccountWithPlatform,
  OrderWithAccount,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { DataSource, Prisma, SymbolProfile, Tag } from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, isAfter, isSameSecond, parseISO } from 'date-fns';
import { uniqBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly orderService: OrderService,
    private readonly platformService: PlatformService,
    private readonly portfolioService: PortfolioService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly tagService: TagService
  ) {}

  public async getDividends({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<Activity[]> {
    try {
      const { activities, firstBuyDate, historicalData } =
        await this.portfolioService.getHolding(dataSource, undefined, symbol);

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

      const accounts = activities
        .filter(({ Account }) => {
          return !!Account;
        })
        .map(({ Account }) => {
          return Account;
        });

      const Account = this.isUniqueAccount(accounts) ? accounts[0] : undefined;

      return await Promise.all(
        Object.entries(dividends).map(async ([dateString, { marketPrice }]) => {
          const quantity =
            historicalData.find((historicalDataItem) => {
              return historicalDataItem.date === dateString;
            })?.quantity ?? 0;

          const value = new Big(quantity).mul(marketPrice).toNumber();

          const date = parseDate(dateString);
          const isDuplicate = activities.some((activity) => {
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
            currency: undefined,
            createdAt: undefined,
            fee: 0,
            feeInAssetProfileCurrency: 0,
            feeInBaseCurrency: 0,
            id: assetProfile.id,
            isDraft: false,
            SymbolProfile: assetProfile,
            symbolProfileId: assetProfile.id,
            type: 'DIVIDEND',
            unitPrice: marketPrice,
            unitPriceInAssetProfileCurrency: marketPrice,
            updatedAt: undefined,
            userId: Account?.userId,
            valueInBaseCurrency: value
          };
        })
      );
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
    const tagIdMapping: { [oldTagId: string]: string } = {};
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
        const accountWithSameId = existingAccounts.find((existingAccount) => {
          return existingAccount.id === account.id;
        });

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

    // Handle tags before activities
    if (!isDryRun) {
      const existingTags = await this.tagService.getTags({
        where: {
          OR: [
            { userId: user.id },
            { userId: null }
          ]
        }
      });

      const canCreateOwnTag = hasPermission(user.permissions, permissions.createOwnTag);
      const canCreateTag = hasPermission(user.permissions, permissions.createTag);

      for (const activity of activitiesDto) {
        if (activity.tags?.length > 0) {
          const newTags = [];
          for (const tag of activity.tags) {
            // Check if tag exists
            const existingTag = existingTags.find((t) => 
              t.id === tag.id || t.name.toLowerCase() === tag.name?.toLowerCase()
            );

            if (existingTag) {
              // Map existing tag ID
              if (tag.id && tag.id !== existingTag.id) {
                tagIdMapping[tag.id] = existingTag.id;
              }
            } else if (tag.name) {
              // Create new tag if permissions allow
              if (canCreateOwnTag || canCreateTag) {
                const newTag = await this.tagService.createTag({
                  name: tag.name,
                  userId: canCreateOwnTag ? user.id : null
                });
                tagIdMapping[tag.id] = newTag.id;
                existingTags.push(newTag);
              }
            }
          }
        }
      }
    }

    for (const activity of activitiesDto) {
      if (!activity.dataSource) {
        if (['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(activity.type)) {
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

        // Update tag IDs with new mappings
        if (activity.tags?.length > 0) {
          activity.tags = activity.tags.map(tag => {
            if (tag.id && tagIdMapping[tag.id]) {
              return { ...tag, id: tagIdMapping[tag.id] };
            }
            return tag;
          });
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

    for (const activity of activitiesExtendedWithErrors) {
      const accountId = activity.accountId;
      const comment = activity.comment;
      const currency = activity.currency;
      const date = activity.date;
      const error = activity.error;
      const fee = activity.fee;
      const quantity = activity.quantity;
      const SymbolProfile = activity.SymbolProfile;
      const type = activity.type;
      const unitPrice = activity.unitPrice;

      const assetProfile = assetProfiles[
        getAssetProfileIdentifier({
          dataSource: SymbolProfile.dataSource,
          symbol: SymbolProfile.symbol
        })
      ] ?? {
        dataSource: SymbolProfile.dataSource,
        symbol: SymbolProfile.symbol
      };
      const {
        assetClass,
        assetSubClass,
        countries,
        createdAt,
        cusip,
        dataSource,
        figi,
        figiComposite,
        figiShareClass,
        holdings,
        id,
        isActive,
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

      if (isDryRun) {
        order = {
          comment,
          currency,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          Account: validatedAccount,
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
            cusip,
            dataSource,
            figi,
            figiComposite,
            figiShareClass,
            holdings,
            id,
            isActive,
            isin,
            name,
            scraperConfiguration,
            sectors,
            symbol,
            symbolMapping,
            updatedAt,
            url,
            comment: assetProfile.comment,
            currency: assetProfile.currency,
            userId: dataSource === 'MANUAL' ? user.id : undefined
          },
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
          currency,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          accountId: validatedAccount?.id,
          SymbolProfile: {
            connectOrCreate: {
              create: {
                dataSource,
                symbol,
                currency: assetProfile.currency,
                userId: dataSource === 'MANUAL' ? user.id : undefined
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

        if (order.SymbolProfile?.symbol) {
          // Update symbol that may have been assigned in createOrder()
          assetProfile.symbol = order.SymbolProfile.symbol;
        }
      }

      const value = new Big(quantity).mul(unitPrice).toNumber();

      activities.push({
        ...order,
        error,
        value,
        // @ts-ignore
        SymbolProfile: assetProfile
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

      this.dataGatheringService.gatherSymbols({
        dataGatheringItems: uniqueActivities.map(({ date, SymbolProfile }) => {
          return {
            date,
            dataSource: SymbolProfile.dataSource,
            symbol: SymbolProfile.symbol
          };
        }),
        priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
      });
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
    const activities: Partial<Activity>[] = [];

    const assetProfiles = await this.validateActivities({
      activitiesDto,
      maxActivitiesToImport: activitiesDto.length,
      user: { id: userId } as UserWithSettings
    });

    const accounts = await this.accountService.getAccounts(userId);

    for (const activity of activitiesDto) {
      const assetProfile =
        assetProfiles[
          getAssetProfileIdentifier({
            dataSource: activity.dataSource,
            symbol: activity.symbol
          })
        ];

      const account = accounts.find(({ id }) => {
        return id === activity.accountId;
      });

      let error: ActivityError;

      if (activity.type === 'DIVIDEND') {
        const isDuplicate = await this.orderService.hasDuplicateOrder({
          accountId: activity.accountId,
          date: parseISO(activity.date),
          fee: activity.fee,
          quantity: activity.quantity,
          symbol: activity.symbol,
          type: activity.type,
          unitPrice: activity.unitPrice,
          userId
        });

        if (isDuplicate) {
          error = { code: 'IS_DUPLICATE' };
        }
      }

      const value = new Big(activity.quantity).mul(activity.unitPrice).toNumber();

      activities.push({
        ...activity,
        Account: account,
        error,
        feeInBaseCurrency: activity.fee,
        feeInAssetProfileCurrency: activity.fee,
        SymbolProfile: assetProfile,
        tags: activity.tags,
        unitPriceInAssetProfileCurrency: activity.unitPrice,
        value,
        valueInBaseCurrency: value
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
    const dataSources = await this.dataProviderService.getDataSources({ user });

    for (const [
      index,
      { currency, dataSource, symbol, type }
    ] of activitiesDto.entries()) {
      if (!dataSources.includes(dataSource)) {
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
        }

        assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })] =
          assetProfile;
      }
    }

    return assetProfiles;
  }
}
