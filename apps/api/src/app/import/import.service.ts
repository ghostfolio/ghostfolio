import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';
import { parseISO } from 'date-fns';

@Injectable()
export class ImportService {
  public constructor(private readonly orderService: OrderService) {}

  public async import({
    orders,
    userId
  }: {
    orders: Partial<Order>[];
    userId: string;
  }): Promise<void> {
    for (const {
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
}
