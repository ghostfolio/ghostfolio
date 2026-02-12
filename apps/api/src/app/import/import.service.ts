import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { DATA_GATHERING_QUEUE_PRIORITY_HIGH } from '@ghostfolio/common/config';
import {
  CreateAssetProfileDto,
  CreateAccountDto,
  CreateOrderDto
} from '@ghostfolio/common/dtos';
import {
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import {
  Activity,
  ActivityError,
  AssetProfileIdentifier
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  AccountWithValue,
  OrderWithAccount,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { DataSource, Prisma, SymbolProfile } from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, isAfter, isSameSecond, parseISO } from 'date-fns';
import { omit, uniqBy } from 'lodash';
import { randomUUID } from 'node:crypto';

import { ImportDataDto } from './import-data.dto';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly orderService: OrderService,
    private readonly platformService: PlatformService,
    private readonly portfolioService: PortfolioService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly tagService: TagService
  ) {}

  public async getDividends({
    dataSource,
    symbol,
    userCurrency,
    userId
  }: AssetProfileIdentifier & {
    userCurrency: string;
    userId: string;
  }): Promise<Activity[]> {
    try {
      const holding = await this.portfolioService.getHolding({
        dataSource,
        symbol,
        userId,
        impersonationId: undefined
      });

      if (!holding) {
        return [];
      }

      const filters = this.apiService.buildFiltersFromQueryParams({
        filterByDataSource: dataSource,
        filterBySymbol: symbol
      });

      const { dateOfFirstActivity, historicalData } = holding;

      const [{ accounts }, { activities }, [assetProfile], dividends] =
        await Promise.all([
          this.portfolioService.getAccountsWithAggregations({
            filters,
            userId,
            withExcludedAccounts: true
          }),
          this.orderService.getOrders({
            filters,
            userCurrency,
            userId,
            startDate: parseDate(dateOfFirstActivity)
          }),
          this.symbolProfileService.getSymbolProfiles([
            {
              dataSource,
              symbol
            }
          ]),
          await this.dataProviderService.getDividends({
            dataSource,
            symbol,
            from: parseDate(dateOfFirstActivity),
            granularity: 'day',
            to: new Date()
          })
        ]);

      const account = this.isUniqueAccount(accounts) ? accounts[0] : undefined;

      return await Promise.all(
        Object.entries(dividends).map(([dateString, { marketPrice }]) => {
          const quantity =
            historicalData.find((historicalDataItem) => {
              return historicalDataItem.date === dateString;
            })?.quantity ?? 0;

          const value = new Big(quantity).mul(marketPrice).toNumber();

          const date = parseDate(dateString);
          const isDuplicate = activities.some((activity) => {
            return (
              activity.accountId === account?.id &&
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
            account,
            date,
            error,
            quantity,
            value,
            accountId: account?.id,
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
            userId: account?.userId,
            valueInBaseCurrency: value
          };
        })
      );
    } catch {
      return [];
    }
  }

  public async import({
    accountsWithBalancesDto,
    activitiesDto,
    assetProfilesWithMarketDataDto,
    isDryRun = false,
    maxActivitiesToImport,
    tagsDto,
    user
  }: {
    accountsWithBalancesDto: ImportDataDto['accounts'];
    activitiesDto: ImportDataDto['activities'];
    assetProfilesWithMarketDataDto: ImportDataDto['assetProfiles'];
    isDryRun?: boolean;
    maxActivitiesToImport: number;
    tagsDto: ImportDataDto['tags'];
    user: UserWithSettings;
  }): Promise<Activity[]> {
    const accountIdMapping: { [oldAccountId: string]: string } = {};
    const assetProfileSymbolMapping: { [oldSymbol: string]: string } = {};
    const tagIdMapping: { [oldTagId: string]: string } = {};
    const userCurrency = user.settings.settings.baseCurrency;

    if (!isDryRun && accountsWithBalancesDto?.length) {
      const [existingAccounts, existingPlatforms] = await Promise.all([
        this.accountService.accounts({
          where: {
            id: {
              in: accountsWithBalancesDto.map(({ id }) => {
                return id;
              })
            }
          }
        }),
        this.platformService.getPlatforms()
      ]);

      for (const accountWithBalances of accountsWithBalancesDto) {
        // Check if there is any existing account with the same ID
        const accountWithSameId = existingAccounts.find((existingAccount) => {
          return existingAccount.id === accountWithBalances.id;
        });

        // If there is no account or if the account belongs to a different user then create a new account
        if (!accountWithSameId || accountWithSameId.userId !== user.id) {
          const account: CreateAccountDto = omit(
            accountWithBalances,
            'balances'
          );

          let oldAccountId: string;
          const platformId = account.platformId;

          delete account.platformId;

          if (accountWithSameId) {
            oldAccountId = account.id;
            delete account.id;
          }

          let accountObject: Prisma.AccountCreateInput = {
            ...account,
            balances: {
              create: accountWithBalances.balances ?? []
            },
            user: { connect: { id: user.id } }
          };

          if (
            existingPlatforms.some(({ id }) => {
              return id === platformId;
            })
          ) {
            accountObject = {
              ...accountObject,
              platform: { connect: { id: platformId } }
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

    if (!isDryRun && assetProfilesWithMarketDataDto?.length) {
      const existingAssetProfiles =
        await this.symbolProfileService.getSymbolProfiles(
          assetProfilesWithMarketDataDto.map(({ dataSource, symbol }) => {
            return { dataSource, symbol };
          })
        );

      for (const assetProfileWithMarketData of assetProfilesWithMarketDataDto) {
        // Check if there is any existing asset profile
        const existingAssetProfile = existingAssetProfiles.find(
          ({ dataSource, symbol }) => {
            return (
              dataSource === assetProfileWithMarketData.dataSource &&
              symbol === assetProfileWithMarketData.symbol
            );
          }
        );

        // If there is no asset profile or if the asset profile belongs to a different user, then create a new asset profile
        if (!existingAssetProfile || existingAssetProfile.userId !== user.id) {
          const assetProfile: CreateAssetProfileDto = omit(
            assetProfileWithMarketData,
            'marketData'
          );

          // Asset profile belongs to a different user
          if (existingAssetProfile) {
            const symbol = randomUUID();
            assetProfileSymbolMapping[assetProfile.symbol] = symbol;
            assetProfile.symbol = symbol;
          }

          // Create a new asset profile
          const assetProfileObject: Prisma.SymbolProfileCreateInput = {
            ...assetProfile,
            user: { connect: { id: user.id } }
          };

          await this.symbolProfileService.add(assetProfileObject);
        }

        // Insert or update market data
        const marketDataObjects = assetProfileWithMarketData.marketData.map(
          (marketData) => {
            return {
              ...marketData,
              dataSource: assetProfileWithMarketData.dataSource,
              symbol: assetProfileWithMarketData.symbol
            } as Prisma.MarketDataUpdateInput;
          }
        );

        await this.marketDataService.updateMany({ data: marketDataObjects });
      }
    }

    if (tagsDto?.length) {
      const existingTagsOfUser = await this.tagService.getTagsForUser(user.id);

      const canCreateOwnTag = hasPermission(
        user.permissions,
        permissions.createOwnTag
      );

      for (const tag of tagsDto) {
        const existingTagOfUser = existingTagsOfUser.find(({ id }) => {
          return id === tag.id;
        });

        if (!existingTagOfUser || existingTagOfUser.userId !== null) {
          if (!canCreateOwnTag) {
            throw new Error(
              `Insufficient permissions to create custom tag ("${tag.name}")`
            );
          }

          if (!isDryRun) {
            const existingTag = await this.tagService.getTag({ id: tag.id });
            let oldTagId: string;

            if (existingTag) {
              oldTagId = tag.id;
              delete tag.id;
            }

            const tagObject: Prisma.TagCreateInput = {
              ...tag,
              user: { connect: { id: user.id } }
            };

            const newTag = await this.tagService.createTag(tagObject);

            if (existingTag && oldTagId) {
              tagIdMapping[oldTagId] = newTag.id;
            }
          }
        }
      }
    }

    for (const activity of activitiesDto) {
      if (!activity.dataSource) {
        if (['FEE', 'INTEREST', 'LIABILITY'].includes(activity.type)) {
          activity.dataSource = DataSource.MANUAL;
        } else {
          activity.dataSource =
            this.dataProviderService.getDataSourceForImport();
        }
      }

      if (!isDryRun) {
        // If a new account is created, then update the accountId in all activities
        if (accountIdMapping[activity.accountId]) {
          activity.accountId = accountIdMapping[activity.accountId];
        }

        // If a new asset profile is created, then update the symbol in all activities
        if (assetProfileSymbolMapping[activity.symbol]) {
          activity.symbol = assetProfileSymbolMapping[activity.symbol];
        }

        // If a new tag is created, then update the tag ID in all activities
        activity.tags = (activity.tags ?? []).map((tagId) => {
          return tagIdMapping[tagId] ?? tagId;
        });
      }
    }

    const assetProfiles = await this.validateActivities({
      activitiesDto,
      assetProfilesWithMarketDataDto,
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
      accountsWithBalancesDto.forEach(({ id, name }) => {
        accounts.push({ id, name });
      });
    }

    const tags = (await this.tagService.getTagsForUser(user.id)).map(
      ({ id, name }) => {
        return { id, name };
      }
    );

    if (isDryRun) {
      tagsDto
        .filter(({ id }) => {
          return !tags.some(({ id: tagId }) => {
            return tagId === id;
          });
        })
        .forEach(({ id, name }) => {
          tags.push({ id, name });
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
      const tagIds = activity.tagIds ?? [];
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
      const validatedTags = tags.filter(({ id: tagId }) => {
        return tagIds.some((activityTagId) => {
          return activityTagId === tagId;
        });
      });

      let order:
        | OrderWithAccount
        | (Omit<OrderWithAccount, 'account' | 'tags'> & {
            account?: { id: string; name: string };
            tags?: { id: string; name: string }[];
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
          account: validatedAccount,
          accountId: validatedAccount?.id,
          accountUserId: undefined,
          createdAt: new Date(),
          id: randomUUID(),
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
          tags: validatedTags,
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
                name,
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
          tags: validatedTags.map(({ id }) => {
            return { id };
          }),
          updateAccountBalance: false,
          user: { connect: { id: user.id } },
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
    const { activities: existingActivities } =
      await this.orderService.getOrders({
        userCurrency,
        userId,
        includeDrafts: true,
        withExcludedAccountsAndActivities: true
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
        tags,
        type,
        unitPrice
      }) => {
        const date = parseISO(dateString);
        const isDuplicate = existingActivities.some((activity) => {
          return (
            activity.accountId === accountId &&
            activity.comment === comment &&
            (activity.currency === currency ||
              activity.SymbolProfile.currency === currency) &&
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
          currency,
          date,
          error,
          fee,
          quantity,
          type,
          unitPrice,
          SymbolProfile: {
            dataSource,
            symbol,
            activitiesCount: undefined,
            assetClass: undefined,
            assetSubClass: undefined,
            countries: undefined,
            createdAt: undefined,
            currency: undefined,
            holdings: undefined,
            id: undefined,
            isActive: true,
            sectors: undefined,
            updatedAt: undefined
          },
          tagIds: tags
        };
      }
    );
  }

  private isUniqueAccount(accounts: AccountWithValue[]) {
    const uniqueAccountIds = new Set<string>();

    for (const { id } of accounts) {
      uniqueAccountIds.add(id);
    }

    return uniqueAccountIds.size === 1;
  }

  private async validateActivities({
    activitiesDto,
    assetProfilesWithMarketDataDto,
    maxActivitiesToImport,
    user
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    assetProfilesWithMarketDataDto: ImportDataDto['assetProfiles'];
    maxActivitiesToImport: number;
    user: UserWithSettings;
  }) {
    if (activitiesDto?.length > maxActivitiesToImport) {
      throw new Error(`Too many activities (${maxActivitiesToImport} at most)`);
    }

    const assetProfiles: {
      [assetProfileIdentifier: string]: Partial<SymbolProfile>;
    } = {};
    const dataSources = await this.dataProviderService.getDataSources();

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
        if (['FEE', 'INTEREST', 'LIABILITY'].includes(type)) {
          // Skip asset profile validation for FEE, INTEREST, and LIABILITY
          // as these activity types don't require asset profiles
          const assetProfileInImport = assetProfilesWithMarketDataDto?.find(
            (profile) => {
              return (
                profile.dataSource === dataSource && profile.symbol === symbol
              );
            }
          );

          assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })] = {
            currency,
            dataSource,
            symbol,
            name: assetProfileInImport?.name
          };

          continue;
        }

        let assetProfile: Partial<SymbolProfile> = { currency };

        try {
          assetProfile = (
            await this.dataProviderService.getAssetProfiles([
              { dataSource, symbol }
            ])
          )?.[symbol];
        } catch {}

        if (!assetProfile?.name) {
          const assetProfileInImport = assetProfilesWithMarketDataDto?.find(
            (profile) => {
              return (
                profile.dataSource === dataSource && profile.symbol === symbol
              );
            }
          );

          if (assetProfileInImport) {
            // Merge all fields of custom asset profiles into the validation object
            Object.assign(assetProfile, {
              assetClass: assetProfileInImport.assetClass,
              assetSubClass: assetProfileInImport.assetSubClass,
              comment: assetProfileInImport.comment,
              countries: assetProfileInImport.countries,
              currency: assetProfileInImport.currency,
              cusip: assetProfileInImport.cusip,
              dataSource: assetProfileInImport.dataSource,
              figi: assetProfileInImport.figi,
              figiComposite: assetProfileInImport.figiComposite,
              figiShareClass: assetProfileInImport.figiShareClass,
              holdings: assetProfileInImport.holdings,
              isActive: assetProfileInImport.isActive,
              isin: assetProfileInImport.isin,
              name: assetProfileInImport.name,
              scraperConfiguration: assetProfileInImport.scraperConfiguration,
              sectors: assetProfileInImport.sectors,
              symbol: assetProfileInImport.symbol,
              symbolMapping: assetProfileInImport.symbolMapping,
              url: assetProfileInImport.url
            });
          }
        }

        if (!['FEE', 'INTEREST', 'LIABILITY'].includes(type)) {
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
