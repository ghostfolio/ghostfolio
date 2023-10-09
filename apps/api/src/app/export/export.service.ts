import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { Export } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly orderService: OrderService
  ) {}

  public async export({
    activityIds,
    userId
  }: {
    activityIds?: string[];
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

    let activities = await this.orderService.orders({
      include: { SymbolProfile: true },
      orderBy: { date: 'desc' },
      where: { userId }
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
            symbol:
              type === 'FEE' ||
              type === 'INTEREST' ||
              type === 'ITEM' ||
              type === 'LIABILITY'
                ? SymbolProfile.name
                : SymbolProfile.symbol
          };
        }
      )
    };
  }
}
