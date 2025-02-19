import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { Filter, Export } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

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
    const accounts = (
      await this.accountService.accounts({
        orderBy: {
          name: 'asc'
        },
        where: { userId }
      })
    ).map(
      ({ balance, comment, currency, id, isExcluded, name, platformId }) => {
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

    const allTags = (await this.tagService.getTagsForUser(userId))
      .filter((value) => {
        return value.isUsed;
      })
      .map(({ id, name }) => {
        return {
          id,
          name
        };
      });

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

    return {
      meta: { date: new Date().toISOString(), version: environment.version },
      accounts,
      activities: activities.map(
        ({
          accountId,
          comment,
          date,
          fee,
          id,
          quantity,
          SymbolProfile,
          tags,
          type,
          unitPrice
        }) => {
          return {
            accountId,
            comment,
            fee,
            id,
            quantity,
            tags: tags.map(({ id: tagId }) => {
              return tagId;
            }),
            type,
            unitPrice,
            currency: SymbolProfile.currency,
            dataSource: SymbolProfile.dataSource,
            date: date.toISOString(),
            symbol:
              type === 'FEE' ||
              type === 'INTEREST' ||
              type === 'ITEM' ||
              type === 'LIABILITY'
                ? SymbolProfile.name
                : SymbolProfile.symbol
          };
        }
      ),
      tags: allTags,
      user: {
        settings: { currency: userCurrency }
      }
    };
  }
}
