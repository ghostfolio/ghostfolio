import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import {
  applyAssetProfileOverrides,
  getAssetProfileIdentifier,
  getCurrencyFromSymbol,
  isCurrency
} from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  AssetProfileIdentifier,
  AssetProfileItem,
  AssetProfilesResponse,
  EnhancedSymbolProfile,
  Filter
} from '@ghostfolio/common/interfaces';
import { MarketDataPreset } from '@ghostfolio/common/types';

import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetClass, AssetSubClass, DataSource, Prisma } from '@prisma/client';
import { groupBy } from 'lodash';

@Injectable()
export class AssetProfilesService {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly benchmarkService: BenchmarkService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async getAssetProfile({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<AdminMarketDataDetails> {
    let activitiesCount: EnhancedSymbolProfile['activitiesCount'] = 0;
    let currency: EnhancedSymbolProfile['currency'] = '-';
    let dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];

    const isCurrencyAssetProfile = isCurrency(getCurrencyFromSymbol(symbol));

    if (isCurrencyAssetProfile) {
      currency = getCurrencyFromSymbol(symbol);
      ({ activitiesCount, dateOfFirstActivity } =
        await this.activitiesService.getStatisticsByCurrency(currency));
    }

    const [[assetProfile], marketData] = await Promise.all([
      this.symbolProfileService.getSymbolProfiles([
        {
          dataSource,
          symbol
        }
      ]),
      this.marketDataService.marketDataItems({
        orderBy: {
          date: 'asc'
        },
        where: {
          dataSource,
          symbol
        }
      })
    ]);

    if (assetProfile) {
      assetProfile.dataProviderInfo = this.dataProviderService
        .getDataProvider(assetProfile.dataSource)
        .getDataProviderInfo();
    }

    return {
      marketData,
      assetProfile: assetProfile ?? {
        activitiesCount,
        currency,
        dataSource,
        dateOfFirstActivity,
        symbol,
        assetClass: isCurrencyAssetProfile ? AssetClass.LIQUIDITY : undefined,
        assetSubClass: isCurrencyAssetProfile ? AssetSubClass.CASH : undefined,
        isActive: true
      }
    };
  }
  public async getAssetProfiles({
    filters = [],
    presetId,
    sortColumn,
    sortDirection = 'asc',
    skip,
    take = Number.MAX_SAFE_INTEGER
  }: {
    filters?: Filter[];
    presetId?: MarketDataPreset;
    skip?: number;
    sortColumn?: string;
    sortDirection?: Prisma.SortOrder;
    take?: number;
  }): Promise<AssetProfilesResponse> {
    let orderBy: Prisma.Enumerable<Prisma.SymbolProfileOrderByWithRelationInput> =
      [{ symbol: 'asc' }];
    const where: Prisma.SymbolProfileWhereInput = {};

    if (presetId === 'BENCHMARKS') {
      const benchmarkAssetProfiles =
        await this.benchmarkService.getBenchmarkAssetProfiles();

      where.id = {
        in: benchmarkAssetProfiles.map(({ id }) => {
          return id;
        })
      };
    } else if (presetId === 'CURRENCIES') {
      return this.getAssetProfilesForCurrencies();
    } else if (
      presetId === 'ETF_WITHOUT_COUNTRIES' ||
      presetId === 'ETF_WITHOUT_SECTORS'
    ) {
      filters = [{ id: 'ETF', type: 'ASSET_SUB_CLASS' }];
    } else if (presetId === 'NO_ACTIVITIES') {
      where.activities = {
        none: {}
      };
    }

    const searchQuery = filters.find(({ type }) => {
      return type === 'SEARCH_QUERY';
    })?.id;

    const {
      ASSET_SUB_CLASS: filtersByAssetSubClass,
      DATA_SOURCE: filtersByDataSource
    } = groupBy(filters, ({ type }) => {
      return type;
    });

    const marketDataItems = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    if (filtersByAssetSubClass) {
      where.assetSubClass = AssetSubClass[filtersByAssetSubClass[0].id];
    }

    if (filtersByDataSource) {
      where.dataSource = DataSource[filtersByDataSource[0].id];
    }

    if (searchQuery) {
      where.OR = [
        { id: { mode: 'insensitive', startsWith: searchQuery } },
        { isin: { mode: 'insensitive', startsWith: searchQuery } },
        { name: { mode: 'insensitive', startsWith: searchQuery } },
        { symbol: { mode: 'insensitive', startsWith: searchQuery } }
      ];
    }

    if (sortColumn) {
      orderBy = [{ [sortColumn]: sortDirection }];

      if (sortColumn === 'activitiesCount') {
        orderBy = [
          {
            activities: {
              _count: sortDirection
            }
          }
        ];
      }
    }

    const extendedPrismaClient = this.getExtendedPrismaClient();

    const symbolProfileResult = await Promise.all([
      extendedPrismaClient.symbolProfile.findMany({
        skip,
        take,
        where,
        orderBy: [...orderBy, { id: sortDirection }],
        select: {
          _count: {
            select: {
              activities: true,
              watchedBy: true
            }
          },
          activities: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          assetClass: true,
          assetSubClass: true,
          comment: true,
          countries: true,
          currency: true,
          dataSource: true,
          id: true,
          isin: true,
          isActive: true,
          isUsedByUsersWithSubscription: true,
          name: true,
          scraperConfiguration: true,
          sectors: true,
          symbol: true,
          SymbolProfileOverrides: true
        }
      }),
      this.prismaService.symbolProfile.count({ where })
    ]);
    const symbolProfiles = symbolProfileResult[0];
    let count = symbolProfileResult[1];

    const lastMarketPrices = await this.prismaService.marketData.findMany({
      distinct: ['dataSource', 'symbol'],
      orderBy: { date: 'desc' },
      select: {
        dataSource: true,
        marketPrice: true,
        symbol: true
      },
      where: {
        dataSource: {
          in: symbolProfiles.map(({ dataSource }) => {
            return dataSource;
          })
        },
        symbol: {
          in: symbolProfiles.map(({ symbol }) => {
            return symbol;
          })
        }
      }
    });

    const lastMarketPriceMap = new Map<string, number>();

    for (const { dataSource, marketPrice, symbol } of lastMarketPrices) {
      lastMarketPriceMap.set(
        getAssetProfileIdentifier({ dataSource, symbol }),
        marketPrice
      );
    }

    let assetProfiles: AssetProfileItem[] = await Promise.all(
      symbolProfiles.map(async (assetProfile) => {
        const {
          _count,
          activities,
          comment,
          currency,
          dataSource,
          id,
          isin,
          isActive,
          isUsedByUsersWithSubscription,
          symbol
        } = assetProfile;

        const { assetClass, assetSubClass, countries, name, sectors } =
          applyAssetProfileOverrides(
            assetProfile,
            assetProfile.SymbolProfileOverrides
          );

        const countriesCount = countries ? Object.keys(countries).length : 0;

        const lastMarketPrice = lastMarketPriceMap.get(
          getAssetProfileIdentifier({ dataSource, symbol })
        );

        const marketDataItemCount =
          marketDataItems.find((marketDataItem) => {
            return (
              marketDataItem.dataSource === dataSource &&
              marketDataItem.symbol === symbol
            );
          })?._count ?? 0;

        const sectorsCount = sectors ? Object.keys(sectors).length : 0;

        return {
          assetClass,
          assetSubClass,
          comment,
          countriesCount,
          currency,
          dataSource,
          id,
          isActive,
          isin,
          lastMarketPrice,
          marketDataItemCount,
          name,
          sectorsCount,
          symbol,
          activitiesCount: _count.activities,
          date: activities?.[0]?.date,
          isUsedByUsersWithSubscription: await isUsedByUsersWithSubscription,
          watchedByCount: _count.watchedBy
        };
      })
    );

    if (presetId) {
      if (presetId === 'ETF_WITHOUT_COUNTRIES') {
        assetProfiles = assetProfiles.filter(({ countriesCount }) => {
          return countriesCount === 0;
        });
      } else if (presetId === 'ETF_WITHOUT_SECTORS') {
        assetProfiles = assetProfiles.filter(({ sectorsCount }) => {
          return sectorsCount === 0;
        });
      }

      count = assetProfiles.length;
    }

    return {
      assetProfiles,
      count
    };
  }

  public async updateAssetProfileData(
    { dataSource, symbol }: AssetProfileIdentifier,
    assetProfileData: UpdateAssetProfileDataDto
  ): Promise<EnhancedSymbolProfile> {
    const notFoundMessage = `Could not find the asset profile for ${symbol} (${dataSource})`;

    const data = this.getAssetProfileDataUpdate(assetProfileData);

    if (Object.keys(data).length > 0) {
      try {
        await this.symbolProfileService.updateSymbolProfile(
          {
            dataSource,
            symbol
          },
          this.symbolProfileService.getAssetProfileUpdateInput(
            { dataSource, symbol },
            data
          )
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException(notFoundMessage);
        }

        throw error;
      }
    }

    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      {
        dataSource,
        symbol
      }
    ]);

    if (!assetProfile) {
      throw new NotFoundException(notFoundMessage);
    }

    return assetProfile;
  }

  private getAssetProfileDataUpdate({
    countries,
    holdings,
    sectors
  }: UpdateAssetProfileDataDto): Pick<
    Prisma.SymbolProfileUpdateInput,
    'countries' | 'holdings' | 'sectors'
  > {
    const data: Pick<
      Prisma.SymbolProfileUpdateInput,
      'countries' | 'holdings' | 'sectors'
    > = {};

    if (countries !== undefined) {
      data.countries = countries as Prisma.JsonArray;
    }

    if (holdings !== undefined) {
      data.holdings = holdings as Prisma.JsonArray;
    }

    if (sectors !== undefined) {
      data.sectors = sectors as Prisma.JsonArray;
    }

    return data;
  }

  private async getAssetProfilesForCurrencies(): Promise<AssetProfilesResponse> {
    const currencyPairs = this.exchangeRateDataService.getCurrencyPairs();

    const [lastMarketPrices, marketDataItems] = await Promise.all([
      this.prismaService.marketData.findMany({
        distinct: ['dataSource', 'symbol'],
        orderBy: { date: 'desc' },
        select: {
          dataSource: true,
          marketPrice: true,
          symbol: true
        },
        where: {
          dataSource: {
            in: currencyPairs.map(({ dataSource }) => {
              return dataSource;
            })
          },
          symbol: {
            in: currencyPairs.map(({ symbol }) => {
              return symbol;
            })
          }
        }
      }),
      this.prismaService.marketData.groupBy({
        _count: true,
        by: ['dataSource', 'symbol']
      })
    ]);

    const lastMarketPriceMap = new Map<string, number>();

    for (const { dataSource, marketPrice, symbol } of lastMarketPrices) {
      lastMarketPriceMap.set(
        getAssetProfileIdentifier({ dataSource, symbol }),
        marketPrice
      );
    }

    const assetProfilePromises: Promise<AssetProfileItem>[] = currencyPairs.map(
      async ({ dataSource, symbol }) => {
        let activitiesCount: EnhancedSymbolProfile['activitiesCount'] = 0;
        let currency: EnhancedSymbolProfile['currency'] = '-';
        let dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];

        if (isCurrency(getCurrencyFromSymbol(symbol))) {
          currency = getCurrencyFromSymbol(symbol);
          ({ activitiesCount, dateOfFirstActivity } =
            await this.activitiesService.getStatisticsByCurrency(currency));
        }

        const lastMarketPrice = lastMarketPriceMap.get(
          getAssetProfileIdentifier({ dataSource, symbol })
        );

        const marketDataItemCount =
          marketDataItems.find((marketDataItem) => {
            return (
              marketDataItem.dataSource === dataSource &&
              marketDataItem.symbol === symbol
            );
          })?._count ?? 0;

        return {
          activitiesCount,
          currency,
          dataSource,
          lastMarketPrice,
          marketDataItemCount,
          symbol,
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: AssetSubClass.CASH,
          countriesCount: 0,
          date: dateOfFirstActivity,
          id: undefined,
          isActive: true,
          name: symbol,
          sectorsCount: 0,
          watchedByCount: 0
        };
      }
    );

    const assetProfiles = await Promise.all(assetProfilePromises);
    return { assetProfiles, count: assetProfiles.length };
  }

  private getExtendedPrismaClient() {
    const symbolProfileExtension = Prisma.defineExtension((client) => {
      return client.$extends({
        result: {
          symbolProfile: {
            isUsedByUsersWithSubscription: {
              compute: async ({ id }) => {
                const { _count } =
                  await this.prismaService.symbolProfile.findUnique({
                    select: {
                      _count: {
                        select: {
                          activities: {
                            where: {
                              user: {
                                subscriptions: {
                                  some: {
                                    expiresAt: {
                                      gt: new Date()
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    where: {
                      id
                    }
                  });

                return _count.activities > 0;
              }
            }
          }
        }
      });
    });

    return this.prismaService.$extends(symbolProfileExtension);
  }
}
