import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { Filter, Export } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { Platform } from '@prisma/client';

@Injectable()
export class ExportService {
  public constructor(
    private readonly accountService: AccountService,
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

    const accounts = (
      await this.accountService.accounts({
        include: {
          balances: true,
          Platform: true
        },
        orderBy: {
          name: 'asc'
        },
        where: { userId }
      })
    )
      .filter(({ id }) => {
        return activities.length > 0
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
          Platform: platform,
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
      platforms: Object.values(platformsMap),
      tags,
      activities: activities.map(
        ({
          accountId,
          comment,
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
            currency: SymbolProfile.currency,
            dataSource: SymbolProfile.dataSource,
            date: date.toISOString(),
            symbol: ['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(type)
              ? SymbolProfile.name
              : SymbolProfile.symbol,
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
