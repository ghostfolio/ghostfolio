import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { getTagsWithDraftTag } from '@ghostfolio/api/helper/activity.helper';
import { getMaskedGhostfolioDataSource } from '@ghostfolio/api/helper/data-source.helper';
import { AccountService } from '@ghostfolio/api/services/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/services/activities/activities.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PlatformService } from '@ghostfolio/api/services/platform/platform.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DEFAULT_CURRENCY,
  ghostfolioPrefix,
  NON_INVESTMENT_ACTIVITY_TYPES,
  TAG_ID_DRAFT,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileDto,
  CreateOrderDto
} from '@ghostfolio/common/dtos';
import { SubscriptionType } from '@ghostfolio/common/enums';
import {
  getAssetProfileIdentifier,
  hasGhostfolioPrefix,
  isValidCustomAssetProfileSymbol,
  parseDate
} from '@ghostfolio/common/helper';
import {
  Activity,
  ActivityError,
  AssetProfileIdentifier,
  EnhancedAssetProfile
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  AccountWithPlatform,
  AccountWithValue,
  OrderWithAccount,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import {
  Account,
  DataSource,
  Prisma,
  Type as ActivityType
} from '@prisma/client';
import { Big } from 'big.js';
import { isISIN } from 'class-validator';
import { isSameSecond, parseISO, subDays } from 'date-fns';
import { omit, uniqBy } from 'lodash-es';
import { randomUUID } from 'node:crypto';

import { ImportValidationError } from './errors/import-validation.error';
import { ImportDataDto } from './import-data.dto';
import { AssetProfileToCreate } from './interfaces/asset-profile-to-create.interface';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly activitiesService: ActivitiesService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
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
        userId
      });

      if (!holding) {
        return [];
      }

      const filters = this.apiService.buildFiltersFromQueryParams({
        filterByDataSource: dataSource,
        filterBySymbol: symbol
      });

      const { dateOfFirstActivity, historicalData } = holding;
      const firstActivityDate = parseDate(dateOfFirstActivity);

      if (!firstActivityDate) {
        return [];
      }

      const [{ accounts }, { activities }, [assetProfile], dividends] =
        await Promise.all([
          this.portfolioService.getAccountsWithAggregations({
            filters,
            userId,
            withExcludedAccounts: true
          }),
          this.activitiesService.getActivities({
            filters,
            userCurrency,
            userId,
            includeDrafts: true,
            startDate: subDays(firstActivityDate, 1),
            withExcludedAccountsAndActivities: true
          }),
          this.symbolProfileService.getSymbolProfiles([
            {
              dataSource,
              symbol
            }
          ]),
          this.dataProviderService.getDividends({
            dataSource,
            symbol,
            from: firstActivityDate,
            granularity: 'day',
            to: new Date()
          })
        ]);

      const account = this.isUniqueAccount(accounts) ? accounts[0] : undefined;

      return await Promise.all(
        Object.entries(dividends).flatMap(([dateString, { marketPrice }]) => {
          const date = parseDate(dateString);

          if (!date) {
            return [];
          }

          const quantity =
            historicalData.find((historicalDataItem) => {
              return historicalDataItem.date === dateString;
            })?.quantity ?? 0;

          const value = new Big(quantity).mul(marketPrice).toNumber();

          const isDuplicate = activities.some((activity) => {
            return (
              activity.assetProfile.currency === assetProfile.currency &&
              activity.assetProfile.dataSource === assetProfile.dataSource &&
              isSameSecond(activity.date, date) &&
              activity.quantity === quantity &&
              activity.assetProfile.symbol === assetProfile.symbol &&
              activity.type === 'DIVIDEND' &&
              activity.unitPrice === marketPrice
            );
          });

          const error: ActivityError | undefined = isDuplicate
            ? { code: 'IS_DUPLICATE' }
            : undefined;

          return [
            {
              account,
              assetProfile,
              date,
              error,
              quantity,
              userId,
              value,
              accountId: account?.id ?? null,
              accountUserId: null,
              comment: null,
              currency: null,
              createdAt: new Date(),
              fee: 0,
              feeInAssetProfileCurrency: 0,
              feeInBaseCurrency: 0,
              id: assetProfile.id,
              symbolProfileId: assetProfile.id,
              type: 'DIVIDEND',
              unitPrice: marketPrice,
              unitPriceInAssetProfileCurrency: marketPrice,
              updatedAt: new Date(),
              valueInBaseCurrency: value
            }
          ];
        })
      );
    } catch {
      return [];
    }
  }

  public getMaxActivitiesToImport({ user }: { user: UserWithSettings }) {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      user.subscription?.type === SubscriptionType.Premium
    ) {
      return Number.MAX_SAFE_INTEGER;
    }

    return this.configurationService.get('MAX_ACTIVITIES_TO_IMPORT');
  }

  public async import({
    accountsWithBalancesDto,
    activitiesDto,
    assetProfilesWithMarketDataDto,
    isDryRun = false,
    platformsDto,
    tagsDto,
    user
  }: {
    accountsWithBalancesDto: ImportDataDto['accounts'];
    activitiesDto: ImportDataDto['activities'];
    assetProfilesWithMarketDataDto: ImportDataDto['assetProfiles'];
    isDryRun?: boolean;
    platformsDto: ImportDataDto['platforms'];
    tagsDto: ImportDataDto['tags'];
    user: UserWithSettings;
  }): Promise<Activity[]> {
    const accountIdMapping: { [oldAccountId: string]: string } = {};
    const assetProfileSymbolMapping: { [oldSymbol: string]: string } = {};
    const ghostfolioDataSources = this.configurationService.get(
      'DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER'
    );
    const maxActivitiesToImport = this.getMaxActivitiesToImport({ user });
    const platformIdMapping: { [oldPlatformId: string]: string } = {};
    const tagIdMapping: { [oldTagId: string]: string } = {};
    const userCurrency =
      user.settings.settings.baseCurrency ?? DEFAULT_CURRENCY;

    // Validate the symbols before any data is persisted
    for (const [index, assetProfileWithMarketData] of (
      assetProfilesWithMarketDataDto ?? []
    ).entries()) {
      const { dataSource, symbol } = assetProfileWithMarketData;

      if (
        dataSource === DataSource.MANUAL &&
        !isValidCustomAssetProfileSymbol(symbol)
      ) {
        throw new ImportValidationError(
          `assetProfiles.${index}.symbol ("${symbol}") must be a UUID or start with the prefix "${ghostfolioPrefix}_" for the data source ("${DataSource.MANUAL}")`
        );
      } else if (
        dataSource !== DataSource.MANUAL &&
        isValidCustomAssetProfileSymbol(symbol)
      ) {
        const maskedDataSource = getMaskedGhostfolioDataSource({
          dataSource,
          ghostfolioDataSources
        });

        throw new ImportValidationError(
          `assetProfiles.${index}.symbol ("${symbol}") is not valid for the data source ("${maskedDataSource}")`
        );
      }
    }

    // Validate the symbols before any data is persisted. Activities without an
    // explicit data source are excluded from the first check, since a symbol is
    // generated in createActivity() if needed.
    for (const [index, activity] of activitiesDto.entries()) {
      const hasDataSource = Boolean(activity.dataSource);

      if (!hasDataSource) {
        activity.dataSource = NON_INVESTMENT_ACTIVITY_TYPES.includes(
          activity.type
        )
          ? DataSource.MANUAL
          : this.dataProviderService.getDataSourceForImport();
      }

      if (
        hasDataSource &&
        activity.dataSource === DataSource.MANUAL &&
        !isValidCustomAssetProfileSymbol(activity.symbol)
      ) {
        throw new ImportValidationError(
          `activities.${index}.symbol ("${activity.symbol}") must be a UUID or start with the prefix "${ghostfolioPrefix}_" for the data source ("${DataSource.MANUAL}")`
        );
      } else if (
        activity.dataSource &&
        activity.dataSource !== DataSource.MANUAL &&
        isValidCustomAssetProfileSymbol(activity.symbol)
      ) {
        const maskedDataSource = getMaskedGhostfolioDataSource({
          ghostfolioDataSources,
          dataSource: activity.dataSource
        });

        throw new ImportValidationError(
          `activities.${index}.symbol ("${activity.symbol}") is not valid for the data source ("${maskedDataSource}")`
        );
      }
    }

    // Resolve the symbols with an ISIN to the symbol of the data provider
    // before the asset profiles are created and the duplicates are detected
    const assetProfileIdentifiersWithIsin: AssetProfileIdentifier[] = uniqBy(
      [...(assetProfilesWithMarketDataDto ?? []), ...activitiesDto].flatMap(
        ({ dataSource, symbol }) => {
          return dataSource &&
            dataSource !== DataSource.MANUAL &&
            isISIN(symbol)
            ? [{ dataSource, symbol }]
            : [];
        }
      ),
      getAssetProfileIdentifier
    );

    const resolvedAssetProfileIdentifiers = await Promise.all(
      assetProfileIdentifiersWithIsin.map(async ({ dataSource, symbol }) => {
        try {
          const assetProfile = await this.dataProviderService
            .getDataProvider(dataSource)
            .getAssetProfile({ symbol });

          return { dataSource, symbol, resolvedSymbol: assetProfile?.symbol };
        } catch {
          return { dataSource, symbol, resolvedSymbol: undefined };
        }
      })
    );

    for (const {
      dataSource,
      resolvedSymbol,
      symbol
    } of resolvedAssetProfileIdentifiers) {
      if (!resolvedSymbol || resolvedSymbol === symbol) {
        continue;
      }

      for (const activity of activitiesDto) {
        if (activity.dataSource === dataSource && activity.symbol === symbol) {
          activity.symbol = resolvedSymbol;
        }
      }

      for (const assetProfileWithMarketData of assetProfilesWithMarketDataDto ??
        []) {
        if (
          assetProfileWithMarketData.dataSource === dataSource &&
          assetProfileWithMarketData.symbol === symbol
        ) {
          assetProfileWithMarketData.symbol = resolvedSymbol;
        }
      }
    }

    if (platformsDto?.length) {
      const canCreatePlatform = hasPermission(
        user.permissions,
        permissions.createPlatform
      );

      const existingPlatforms = await this.platformService.getPlatforms();

      for (const platform of platformsDto) {
        // Check if there is any existing platform with the same ID, otherwise
        // fall back to a platform with the same URL
        const existingPlatform =
          existingPlatforms.find(({ id }) => {
            return id === platform.id;
          }) ??
          existingPlatforms.find(({ url }) => {
            return url === platform.url;
          });

        if (existingPlatform) {
          // Store the new to old platform ID mappings for creating accounts
          if (platform.id && existingPlatform.id !== platform.id) {
            platformIdMapping[platform.id] = existingPlatform.id;
          }
        } else {
          if (!canCreatePlatform) {
            throw new ImportValidationError(
              `Insufficient permissions to create platform ("${platform.name}")`
            );
          }

          if (!isDryRun) {
            await this.platformService.createPlatform(platform);
          }
        }
      }
    }

    const existingTagsOfUser =
      tagsDto?.length || (!isDryRun && accountsWithBalancesDto?.length)
        ? await this.tagService.getTagsForUser(user.id)
        : [];

    if (tagsDto?.length) {
      const canCreateOwnTag = hasPermission(
        user.permissions,
        permissions.createOwnTag
      );

      for (const tag of tagsDto) {
        const existingTagOfUser = existingTagsOfUser.find(({ id }) => {
          return id === tag.id;
        });

        if (!existingTagOfUser) {
          if (!canCreateOwnTag) {
            throw new ImportValidationError(
              `Insufficient permissions to create custom tag ("${tag.name}")`
            );
          }

          if (!isDryRun) {
            const existingTag = await this.tagService.getTag({ id: tag.id });
            let oldTagId: string | undefined;

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

            existingTagsOfUser.push({
              id: newTag.id,
              isUsed: false,
              name: newTag.name,
              userId: newTag.userId
            });
          }
        }
      }
    }

    if (accountsWithBalancesDto?.length) {
      const [
        existingAccountsOfOtherUsers,
        existingAccountsOfUser,
        existingPlatforms
      ] = await Promise.all([
        this.accountService.accounts({
          where: {
            id: {
              in: accountsWithBalancesDto
                .map(({ id }) => {
                  return id;
                })
                .filter((id): id is string => {
                  return Boolean(id);
                })
            },
            userId: { not: user.id }
          }
        }),
        this.accountService.accounts({
          where: { userId: user.id }
        }),
        this.platformService.getPlatforms()
      ]);

      const existingTagIds = new Set(
        existingTagsOfUser.map(({ id }) => {
          return id;
        })
      );

      for (const accountWithBalances of accountsWithBalancesDto) {
        // Skip the account if it already belongs to the user
        if (
          existingAccountsOfUser.some(({ id }) => {
            return id === accountWithBalances.id;
          })
        ) {
          continue;
        }

        // If there is no account or if the account belongs to a different
        // user, then reuse an existing account of the user with the same name
        // and currency or create a new account
        const accountToReuse = this.getAccountToReuse({
          accountWithBalances,
          accountsWithBalancesDto,
          existingAccountsOfUser
        });

        if (accountToReuse) {
          // Reuse the account of the user instead of creating a duplicate. The
          // balances, the platform and the tags of the import are deliberately
          // not applied to leave the existing account of the user untouched.
          if (
            accountWithBalances.id &&
            accountWithBalances.id !== accountToReuse.id
          ) {
            // Store the new to old account ID mappings for updating activities
            accountIdMapping[accountWithBalances.id] = accountToReuse.id;
          }

          continue;
        }

        if (isDryRun) {
          continue;
        }

        // Check if there is any existing account of a different user with the
        // same ID, since the ID cannot be reused in this case
        const accountWithSameIdOfOtherUser = existingAccountsOfOtherUsers.find(
          ({ id }) => {
            return id === accountWithBalances.id;
          }
        );

        const account = omit(accountWithBalances, [
          'balance',
          'balances',
          'isExcluded',
          'platformId',
          'tags'
        ]);

        let oldAccountId: string | undefined;
        const platformId = accountWithBalances.platformId
          ? (platformIdMapping[accountWithBalances.platformId] ??
            accountWithBalances.platformId)
          : undefined;

        if (accountWithSameIdOfOtherUser) {
          oldAccountId = account.id;
          delete account.id;
        }

        const tagIds = (accountWithBalances.tags ?? [])
          .map((tagId) => {
            return tagIdMapping[tagId] ?? tagId;
          })
          .filter((tagId) => {
            return existingTagIds.has(tagId);
          });

        // Map the legacy isExcluded attribute of old export files to
        // the "Exclude from Analysis" tag
        if (
          accountWithBalances.isExcluded &&
          existingTagIds.has(TAG_ID_EXCLUDE_FROM_ANALYSIS) &&
          !tagIds.includes(TAG_ID_EXCLUDE_FROM_ANALYSIS)
        ) {
          tagIds.push(TAG_ID_EXCLUDE_FROM_ANALYSIS);
        }

        let accountObject: Prisma.AccountCreateInput = {
          ...account,
          balances: {
            create: accountWithBalances.balances ?? []
          },
          user: { connect: { id: user.id } }
        };

        if (
          platformId &&
          existingPlatforms.some(({ id }) => {
            return id === platformId;
          })
        ) {
          accountObject = {
            ...accountObject,
            platform: { connect: { id: platformId } }
          };
        }

        const newAccount = await this.accountService.createAccount({
          tagIds,
          balance: accountWithBalances.balance,
          data: accountObject,
          userId: user.id
        });

        // Store the new to old account ID mappings for updating activities
        if (accountWithSameIdOfOtherUser && oldAccountId) {
          accountIdMapping[oldAccountId] = newAccount.id;
        }
      }
    }

    const assetProfilesToCreate: AssetProfileToCreate[] = [];

    if (assetProfilesWithMarketDataDto?.length) {
      const customAssetProfileNames = assetProfilesWithMarketDataDto
        .filter(
          (
            assetProfile
          ): assetProfile is typeof assetProfile & { name: string } => {
            return (
              assetProfile.dataSource === DataSource.MANUAL &&
              Boolean(assetProfile.name)
            );
          }
        )
        .map(({ name }) => {
          return name;
        });

      const [existingAssetProfiles, existingCustomAssetProfilesOfUser] =
        await Promise.all([
          this.symbolProfileService.getSymbolProfiles(
            assetProfilesWithMarketDataDto.map(({ dataSource, symbol }) => {
              return { dataSource, symbol };
            })
          ),
          this.symbolProfileService.getCustomSymbolProfilesByNames({
            names: customAssetProfileNames,
            userId: user.id
          })
        ]);

      for (const assetProfileWithMarketData of assetProfilesWithMarketDataDto) {
        let assetProfileToCreate: Prisma.SymbolProfileCreateInput | undefined;
        let symbol = assetProfileWithMarketData.symbol;

        // Check if there is any existing asset profile
        const existingAssetProfile = existingAssetProfiles.find(
          (assetProfile) => {
            return (
              assetProfile.dataSource ===
                assetProfileWithMarketData.dataSource &&
              assetProfile.symbol === assetProfileWithMarketData.symbol
            );
          }
        );

        // If there is no asset profile or if the asset profile belongs to a
        // different user, then reuse the custom asset profile of the user or
        // create a new asset profile
        if (existingAssetProfile?.userId !== user.id) {
          // Check if the user has a custom asset profile with the same name.
          // Skip asset profiles with a legacy free-text symbol as they would
          // fail the symbol validation on a future import.
          const existingCustomAssetProfileOfUser =
            assetProfileWithMarketData.dataSource === DataSource.MANUAL
              ? existingCustomAssetProfilesOfUser.find((customAssetProfile) => {
                  return (
                    customAssetProfile.name ===
                      assetProfileWithMarketData.name &&
                    isValidCustomAssetProfileSymbol(customAssetProfile.symbol)
                  );
                })
              : undefined;

          if (existingCustomAssetProfileOfUser) {
            // Reuse the custom asset profile of the user instead of creating a duplicate
            symbol = existingCustomAssetProfileOfUser.symbol;
          } else {
            const assetProfile: CreateAssetProfileDto = omit(
              assetProfileWithMarketData,
              'marketData'
            );

            if (
              (existingAssetProfile || hasGhostfolioPrefix(symbol)) &&
              !isDryRun
            ) {
              const isSymbolOfAssetProfileToCreate = assetProfilesToCreate.some(
                ({ assetProfile: { symbol: symbolToCreate } }) => {
                  return symbolToCreate === assetProfileSymbolMapping[symbol];
                }
              );

              if (hasGhostfolioPrefix(symbol)) {
                assetProfile.name ??= symbol;
              }

              symbol = isSymbolOfAssetProfileToCreate
                ? assetProfileSymbolMapping[symbol]
                : randomUUID();
            }

            assetProfile.symbol = symbol;

            if (!isDryRun) {
              assetProfileToCreate = {
                ...assetProfile,
                user: { connect: { id: user.id } }
              };
            }
          }

          if (symbol !== assetProfileWithMarketData.symbol) {
            assetProfileSymbolMapping[assetProfileWithMarketData.symbol] =
              symbol;

            // Keep the asset profile in sync with the activities to validate
            assetProfileWithMarketData.symbol = symbol;
          }
        }

        if (!isDryRun) {
          const marketDataObjects = (
            assetProfileWithMarketData.marketData ?? []
          ).map((marketData) => {
            return {
              ...marketData,
              symbol,
              dataSource: assetProfileWithMarketData.dataSource
            } as Prisma.MarketDataUpdateInput;
          });

          if (assetProfileToCreate) {
            const assetProfileToCreateIdentifier =
              getAssetProfileIdentifier(assetProfileToCreate);

            const duplicateAssetProfileToCreate = assetProfilesToCreate.find(
              ({ assetProfile }) => {
                return (
                  getAssetProfileIdentifier(assetProfile) ===
                  assetProfileToCreateIdentifier
                );
              }
            );

            if (duplicateAssetProfileToCreate) {
              // The import contains the same asset profile more than once,
              // which would fail with a unique constraint violation. Keep the
              // first asset profile and merge the market data into it.
              duplicateAssetProfileToCreate.marketDataObjects.push(
                ...marketDataObjects
              );
            } else {
              // Create the new asset profile and its market data later, once it
              // is known which activities are imported
              assetProfilesToCreate.push({
                marketDataObjects,
                assetProfile: assetProfileToCreate
              });
            }
          } else {
            // Insert or update market data
            await this.marketDataService.updateMany({
              data: marketDataObjects
            });
          }
        }
      }
    }

    for (const activity of activitiesDto) {
      // If an asset profile is created or reused, then update the symbol in all activities
      if (assetProfileSymbolMapping[activity.symbol]) {
        activity.symbol = assetProfileSymbolMapping[activity.symbol];
      }

      // If an account is created or reused, then update the accountId in all activities
      if (activity.accountId && accountIdMapping[activity.accountId]) {
        activity.accountId = accountIdMapping[activity.accountId];
      }

      if (!isDryRun) {
        // If a new tag is created, then update the tag ID in all activities
        activity.tags = (activity.tags ?? []).map((tagId) => {
          return tagIdMapping[tagId] ?? tagId;
        });
      }
    }

    const assetProfiles = await this.dataProviderService.validateActivities({
      activitiesDto,
      assetProfilesWithMarketDataDto,
      maxActivitiesToImport,
      subscription: user.subscription,
      userId: user.id
    });

    const activitiesExtendedWithErrors = await this.extendActivitiesWithErrors({
      activitiesDto,
      userCurrency,
      userId: user.id
    });

    const accounts: Pick<AccountWithPlatform, 'id' | 'name' | 'platform'>[] = (
      await this.accountService.accounts({
        include: { platform: true },
        where: { userId: user.id }
      })
    ).map(({ id, name, platform }) => {
      return { id, name, platform };
    });

    if (isDryRun && accountsWithBalancesDto?.length) {
      accountsWithBalancesDto
        .filter(
          (
            account
          ): account is CreateAccountWithBalancesDto & { id: string } => {
            if (!account.id) {
              return false;
            }

            return (
              !accountIdMapping[account.id] &&
              !accounts.some(({ id: accountId }) => {
                return accountId === account.id;
              })
            );
          }
        )
        .forEach(({ id, name }) => {
          accounts.push({ id, name });
        });
    }

    // Validate the accounts before any activity is created, since an account
    // which does not belong to the user is dropped without a notice otherwise
    for (const [index, { accountId }] of activitiesDto.entries()) {
      if (
        accountId &&
        !accounts.some(({ id }) => {
          return id === accountId;
        })
      ) {
        throw new ImportValidationError(
          `activities.${index}.accountId ("${accountId}") is not valid`
        );
      }
    }

    const tags = (await this.tagService.getTagsForUser(user.id)).map(
      ({ id, name }) => {
        return { id, name };
      }
    );

    if (isDryRun && tagsDto?.length) {
      tagsDto
        .filter((tag): tag is typeof tag & { id: string } => {
          return (
            Boolean(tag.id) &&
            !tags.some(({ id: tagId }) => {
              return tagId === tag.id;
            })
          );
        })
        .forEach(({ id, name }) => {
          tags.push({ id, name });
        });
    }

    // Preview the "Draft" tag which createActivity() assigns in a real run
    const draftTag = tags.find(({ id }) => {
      return id === TAG_ID_DRAFT;
    }) ?? { id: TAG_ID_DRAFT, name: 'DRAFT' };

    // Create the new asset profiles of the activities to import only, so that
    // no unused asset profile remains, for example if no activity refers to
    // the asset profile. An asset profile which is created before the
    // validation of the activities would stay behind, because the import is
    // not rolled back on an error.
    if (!isDryRun) {
      for (const {
        assetProfile,
        marketDataObjects
      } of this.getAssetProfilesToCreate({
        activities: activitiesExtendedWithErrors,
        assetProfiles: assetProfilesToCreate
      })) {
        await this.symbolProfileService.add(assetProfile);

        await this.marketDataService.updateMany({ data: marketDataObjects });
      }
    }

    const activities: Activity[] = [];

    const customAssetProfileSymbols: {
      [assetProfileIdentifier: string]: string;
    } = {};

    for (const activity of activitiesExtendedWithErrors) {
      const accountId = activity.accountId;
      const comment = activity.comment;
      const currency = activity.currency;
      const date = activity.date;
      const error = activity.error;
      const fee = activity.fee;
      const quantity = activity.quantity;
      const tagIds = activity.tagIds ?? [];
      const type = activity.type;
      const unitPrice = activity.unitPrice;

      const assetProfileIdentifier = getAssetProfileIdentifier({
        dataSource: activity.assetProfile.dataSource,
        symbol: activity.assetProfile.symbol
      });

      let assetProfile = assetProfiles[assetProfileIdentifier] ?? {
        dataSource: activity.assetProfile.dataSource,
        symbol: activity.assetProfile.symbol
      };
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
        | (Omit<
            OrderWithAccount,
            'account' | 'SymbolProfile' | 'symbolProfileId' | 'tags'
          > & {
            account?: Pick<AccountWithPlatform, 'id' | 'name' | 'platform'>;
            symbolProfileId?: string;
            tags?: { id: string; name: string }[];
          });

      if (isDryRun) {
        const previewTags = getTagsWithDraftTag({
          date,
          draftTag,
          type,
          tags: validatedTags
        });

        order = {
          comment: comment ?? null,
          currency,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          account: validatedAccount,
          accountId: validatedAccount?.id ?? null,
          accountUserId: null,
          createdAt: new Date(),
          id: randomUUID(),
          symbolProfileId: undefined,
          tags: previewTags,
          updatedAt: new Date(),
          userId: user.id
        };
      } else {
        if (error) {
          continue;
        }

        const customAssetProfileSymbol =
          NON_INVESTMENT_ACTIVITY_TYPES.includes(type) ||
          assetProfile.dataSource === DataSource.MANUAL
            ? customAssetProfileSymbols[assetProfileIdentifier]
            : undefined;

        const dataSource =
          assetProfile.dataSource ?? activity.assetProfile.dataSource;
        const name = assetProfile.name;
        const symbol =
          customAssetProfileSymbol ??
          assetProfile.symbol ??
          activity.assetProfile.symbol;

        if (!assetProfile.currency) {
          throw new ImportValidationError(
            `Asset profile ("${symbol}") has no currency`
          );
        }

        const createdActivity = await this.activitiesService.createActivity({
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

        if (createdActivity.SymbolProfile.dataSource === DataSource.MANUAL) {
          customAssetProfileSymbols[assetProfileIdentifier] =
            createdActivity.SymbolProfile.symbol;

          assetProfile = {
            ...assetProfile,
            dataSource: DataSource.MANUAL,
            symbol: createdActivity.SymbolProfile.symbol
          };
        }

        order = createdActivity;
      }

      const value = new Big(quantity).mul(unitPrice).toNumber();

      const valueInBaseCurrency =
        (await this.exchangeRateDataService.toCurrencyAtDate(
          value,
          currency ?? assetProfile.currency,
          userCurrency,
          date
        )) ?? 0;

      activities.push({
        ...omit(order, ['SymbolProfile']),
        // @ts-ignore
        assetProfile,
        error,
        value,
        valueInBaseCurrency
      });
    }

    activities.sort((activity1, activity2) => {
      return Number(activity1.date) - Number(activity2.date);
    });

    if (!isDryRun) {
      // Gather symbol data in the background, if not dry run
      const uniqueActivities = uniqBy(activities, ({ assetProfile }) => {
        return getAssetProfileIdentifier({
          dataSource: assetProfile.dataSource,
          symbol: assetProfile.symbol
        });
      });

      this.dataGatheringService.gatherSymbols({
        dataGatheringItems: uniqueActivities.map(({ assetProfile, date }) => {
          return {
            date,
            dataSource: assetProfile.dataSource,
            symbol: assetProfile.symbol
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
    activitiesDto: CreateOrderDto[];
    userCurrency: string;
    userId: string;
  }): Promise<
    {
      accountId?: string;
      assetProfile: Pick<EnhancedAssetProfile, 'dataSource' | 'symbol'>;
      comment?: string | null;
      currency: string;
      date: Date;
      error?: ActivityError;
      fee: number;
      quantity: number;
      tagIds?: string[];
      type: ActivityType;
      unitPrice: number;
    }[]
  > {
    const { activities: existingActivities } =
      await this.activitiesService.getActivities({
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
            (activity.comment || null) === (comment || null) &&
            (activity.currency === currency ||
              activity.assetProfile.currency === currency) &&
            activity.assetProfile.dataSource === dataSource &&
            isSameSecond(activity.date, date) &&
            activity.fee === fee &&
            activity.quantity === quantity &&
            activity.assetProfile.symbol === symbol &&
            activity.type === type &&
            activity.unitPrice === unitPrice
          );
        });

        const error: ActivityError | undefined = isDuplicate
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
          assetProfile: {
            // The data source of each activity is already set in import(). The
            // fallback only satisfies the type, since MANUAL is not the default
            // data source of investment activities.
            dataSource: dataSource ?? DataSource.MANUAL,
            symbol
          },
          tagIds: tags
        };
      }
    );
  }

  /**
   * Returns the account of the user to reuse for the given account of the
   * import, based on the name and the currency. The currency is considered
   * because the activities of the import would otherwise end up in an account
   * of a different currency. The name is only considered if it is unambiguous,
   * both in the accounts of the user and in the accounts of the import, since
   * it is not unique. Otherwise, distinct accounts would be merged into a
   * single one.
   */
  private getAccountToReuse({
    accountWithBalances,
    accountsWithBalancesDto,
    existingAccountsOfUser
  }: {
    accountWithBalances: CreateAccountWithBalancesDto;
    accountsWithBalancesDto: ImportDataDto['accounts'];
    existingAccountsOfUser: Account[];
  }): Account | undefined {
    const matchingAccountsOfUser = existingAccountsOfUser.filter(
      ({ currency, name }) => {
        return (
          currency === accountWithBalances.currency &&
          name === accountWithBalances.name
        );
      }
    );

    const matchingAccountsToImport = (accountsWithBalancesDto ?? []).filter(
      ({ currency, name }) => {
        return (
          currency === accountWithBalances.currency &&
          name === accountWithBalances.name
        );
      }
    );

    if (
      matchingAccountsOfUser.length !== 1 ||
      matchingAccountsToImport.length !== 1
    ) {
      return undefined;
    }

    return matchingAccountsOfUser[0];
  }

  private getAssetProfilesToCreate({
    activities,
    assetProfiles
  }: {
    activities: {
      assetProfile: Pick<EnhancedAssetProfile, 'dataSource' | 'symbol'>;
      error?: ActivityError;
    }[];
    assetProfiles: AssetProfileToCreate[];
  }) {
    const assetProfileIdentifiersToImport = new Set(
      activities
        .filter(({ error }) => {
          return !error;
        })
        .map(({ assetProfile }) => {
          return getAssetProfileIdentifier(assetProfile);
        })
    );

    return assetProfiles.filter(({ assetProfile }) => {
      return assetProfileIdentifiersToImport.has(
        getAssetProfileIdentifier(assetProfile)
      );
    });
  }

  private isUniqueAccount(accounts: AccountWithValue[]) {
    const uniqueAccountIds = new Set<string>();

    for (const { id } of accounts) {
      uniqueAccountIds.add(id);
    }

    return uniqueAccountIds.size === 1;
  }
}
