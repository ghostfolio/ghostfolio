import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { Injectable } from '@nestjs/common';
import { isSameDay, parseISO } from 'date-fns';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly orderService: OrderService
  ) {}

  public async import({
    activities,
    userId
  }: {
    activities: Partial<CreateOrderDto>[];
    userId: string;
  }): Promise<void> {
    for (const activity of activities) {
      if (!activity.dataSource) {
        if (activity.type === 'ITEM') {
          activity.dataSource = 'MANUAL';
        } else {
          activity.dataSource = this.dataProviderService.getPrimaryDataSource();
        }
      }
    }

    await this.validateActivities({ activities, userId });

    const accountIds = (await this.accountService.getAccounts(userId)).map(
      (account) => {
        return account.id;
      }
    );

    for (const {
      accountId,
      currency,
      dataSource,
      date,
      fee,
      quantity,
      symbol,
      type,
      unitPrice
    } of activities) {
      await this.orderService.createOrder({
        fee,
        quantity,
        type,
        unitPrice,
        userId,
        accountId: accountIds.includes(accountId) ? accountId : undefined,
        date: parseISO(<string>(<unknown>date)),
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
        User: { connect: { id: userId } }
      });
    }
  }

  private async validateActivities({
    activities,
    userId
  }: {
    activities: Partial<CreateOrderDto>[];
    userId: string;
  }) {
    if (
      activities?.length > this.configurationService.get('MAX_ORDERS_TO_IMPORT')
    ) {
      throw new Error(
        `Too many activities (${this.configurationService.get(
          'MAX_ORDERS_TO_IMPORT'
        )} at most)`
      );
    }

    const existingActivities = await this.orderService.orders({
      include: { SymbolProfile: true },
      orderBy: { date: 'desc' },
      where: { userId }
    });

    for (const [
      index,
      { currency, dataSource, date, fee, quantity, symbol, type, unitPrice }
    ] of activities.entries()) {
      const duplicateActivity = existingActivities.find((activity) => {
        return (
          activity.SymbolProfile.currency === currency &&
          activity.SymbolProfile.dataSource === dataSource &&
          isSameDay(activity.date, parseISO(<string>(<unknown>date))) &&
          activity.fee === fee &&
          activity.quantity === quantity &&
          activity.SymbolProfile.symbol === symbol &&
          activity.type === type &&
          activity.unitPrice === unitPrice
        );
      });

      if (duplicateActivity) {
        throw new Error(`activities.${index} is a duplicate activity`);
      }

      if (dataSource !== 'MANUAL') {
        const quotes = await this.dataProviderService.getQuotes([
          { dataSource, symbol }
        ]);

        if (quotes[symbol] === undefined) {
          throw new Error(
            `activities.${index}.symbol ("${symbol}") is not valid for the specified data source ("${dataSource}")`
          );
        }

        if (quotes[symbol].currency !== currency) {
          throw new Error(
            `activities.${index}.currency ("${currency}") does not match with "${quotes[symbol].currency}"`
          );
        }
      }
    }
  }
}
