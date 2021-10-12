import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';
import { parseISO } from 'date-fns';

@Injectable()
export class ImportService {
  private static MAX_ORDERS_TO_IMPORT = 20;

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly orderService: OrderService
  ) {}

  public async import({
    orders,
    userId
  }: {
    orders: Partial<Order>[];
    userId: string;
  }): Promise<void> {
    await this.validateOrders(orders);

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
    } of orders) {
      await this.orderService.createOrder({
        Account: {
          connect: {
            id_userId: { userId, id: accountId }
          }
        },
        currency,
        dataSource,
        fee,
        quantity,
        symbol,
        type,
        unitPrice,
        date: parseISO(<string>(<unknown>date)),
        User: { connect: { id: userId } }
      });
    }
  }

  private async validateOrders(orders: Partial<Order>[]) {
    if (orders?.length > ImportService.MAX_ORDERS_TO_IMPORT) {
      throw new Error('Too many transactions');
    }

    for (const { dataSource, symbol } of orders) {
      const result = await this.dataProviderService.get([
        { dataSource, symbol }
      ]);

      if (result[symbol] === undefined) {
        throw new Error(`${symbol} is not a valid symbol for ${dataSource}`);
      }
    }
  }
}
