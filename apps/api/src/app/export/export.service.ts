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
    const platforms: Platform[] = [];

    const accounts = (
      await this.accountService.accounts({
        include: {
          Platform: true
        },
        orderBy: {
          name: 'asc'
        },
        where: { userId }
      })
    ).map(
      ({
        balance,
        comment,
        currency,
        id,
        isExcluded,
        name,
        platformId,
        Platform: platform
      }) => {
        if (
          !platforms.some(({ id: currentPlatformId }) => {
            return currentPlatformId === platform.id;
          })
        ) {
          platforms.push(platform);
        }

        return {
          balance,
          comment,
          currency,
          id,
          isExcluded,
          name,
          platformId
        };
      }
    );

    let { activities } = await this.orderService.getOrders({
      filters,
      userCurrency,
      userId,
      includeDrafts: true,
      sortColumn: 'date',
      sortDirection: 'asc',
      withExcludedAccounts: true
    });

    if (activityIds) {
      activities = activities.filter((activity) => {
        return activityIds.includes(activity.id);
      });
    }

    const tags = (await this.tagService.getTagsForUser(userId))
      .filter(({ isUsed }) => {
        return isUsed;
      })
      .map(({ id, name }) => {
        return {
          id,
          name
        };
      });

    return {
      meta: { date: new Date().toISOString(), version: environment.version },
      accounts,
      platforms,
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
