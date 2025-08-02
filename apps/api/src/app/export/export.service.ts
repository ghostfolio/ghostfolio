import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { Filter, Export } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';
import { groupBy, uniqBy } from 'lodash';

@Injectable()
export class ExportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly marketDataService: MarketDataService,
    private readonly orderService: OrderService,
    private readonly tagService: TagService
  ) {}

  public async export({
    activityIds,
    filters,
    userCurrency,
    userId
  }: {
    activityIds?: string[];
    filters?: Filter[];
    userCurrency: string;
    userId: string;
  }): Promise<Export> {
    const { ACCOUNT: filtersByAccount } = groupBy(filters, ({ type }) => {
      return type;
    });
    const platformsMap: { [platformId: string]: Platform } = {};

    let { activities } = await this.orderService.getOrders({
      filters,
      userCurrency,
      userId,
      includeDrafts: true,
      sortColumn: 'date',
      sortDirection: 'asc',
      withExcludedAccounts: true
    });

    if (activityIds?.length > 0) {
      activities = activities.filter(({ id }) => {
        return activityIds.includes(id);
      });
    }

    const where: Prisma.AccountWhereInput = { userId };

    if (filtersByAccount?.length > 0) {
      where.id = {
        in: filtersByAccount.map(({ id }) => {
          return id;
        })
      };
    }

    const accounts = (
      await this.accountService.accounts({
        where,
        include: {
          balances: true,
          platform: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    )
      .filter(({ id }) => {
        return activityIds?.length > 0
          ? activities.some(({ accountId }) => {
              return accountId === id;
            })
          : true;
      })
      .map(
        ({
          balance,
          balances,
          comment,
          currency,
          id,
          isExcluded,
          name,
          platform,
          platformId
        }) => {
          if (platformId) {
            platformsMap[platformId] = platform;
          }

          return {
            balance,
            balances: balances.map(({ date, value }) => {
              return { date: date.toISOString(), value };
            }),
            comment,
            currency,
            id,
            isExcluded,
            name,
            platformId
          };
        }
      );

    const customAssetProfiles = uniqBy(
      activities
        .map(({ SymbolProfile }) => {
          return SymbolProfile;
        })
        .filter(({ userId: assetProfileUserId }) => {
          return assetProfileUserId === userId;
        }),
      ({ id }) => {
        return id;
      }
    );

    const marketDataByAssetProfile = Object.fromEntries(
      await Promise.all(
        customAssetProfiles.map(async ({ dataSource, id, symbol }) => {
          const marketData = (
            await this.marketDataService.marketDataItems({
              where: { dataSource, symbol }
            })
          ).map(({ date, marketPrice }) => ({
            date: date.toISOString(),
            marketPrice
          }));

          return [id, marketData] as const;
        })
      )
    );

    const tags = (await this.tagService.getTagsForUser(userId))
      .filter(
        ({ id, isUsed }) =>
          isUsed &&
          activities.some((activity) => {
            return activity.tags.some(({ id: tagId }) => {
              return tagId === id;
            });
          })
      )
      .map(({ id, name }) => {
        return {
          id,
          name
        };
      });

    return {
      meta: { date: new Date().toISOString(), version: environment.version },
      accounts,
      assetProfiles: customAssetProfiles.map(
        ({
          assetClass,
          assetSubClass,
          comment,
          countries,
          currency,
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
          url
        }) => {
          return {
            assetClass,
            assetSubClass,
            comment,
            countries: countries as unknown as Prisma.JsonArray,
            currency,
            cusip,
            dataSource,
            figi,
            figiComposite,
            figiShareClass,
            holdings: holdings as unknown as Prisma.JsonArray,
            isActive,
            isin,
            marketData: marketDataByAssetProfile[id],
            name,
            scraperConfiguration:
              scraperConfiguration as unknown as Prisma.JsonArray,
            sectors: sectors as unknown as Prisma.JsonArray,
            symbol,
            symbolMapping,
            url
          };
        }
      ),
      platforms: Object.values(platformsMap),
      tags,
      activities: activities.map(
        ({
          accountId,
          comment,
          currency,
          date,
          fee,
          id,
          quantity,
          SymbolProfile,
          tags: currentTags,
          type,
          unitPrice
        }) => {
          return {
            accountId,
            comment,
            fee,
            id,
            quantity,
            type,
            unitPrice,
            currency: currency ?? SymbolProfile.currency,
            dataSource: SymbolProfile.dataSource,
            date: date.toISOString(),
            symbol: SymbolProfile.symbol,
            tags: currentTags.map(({ id: tagId }) => {
              return tagId;
            })
          };
        }
      ),
      user: {
        settings: { currency: userCurrency }
      }
    };
  }
}
