import { Injectable } from '@nestjs/common';
import { Currency, Type } from '@prisma/client';
import { parseISO } from 'date-fns';

import { Portfolio } from '../../models/portfolio';
import { DataProviderService } from '../../services/data-provider.service';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { PrismaService } from '../../services/prisma.service';
import { RulesService } from '../../services/rules.service';
import { OrderWithPlatform } from '../order/interfaces/order-with-platform.type';
import { CreateOrderDto } from './create-order.dto';
import { Data } from './interfaces/data.interface';

@Injectable()
export class ExperimentalService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private prisma: PrismaService,
    private readonly rulesService: RulesService
  ) {}

  public async getBenchmark(aSymbol: string) {
    return this.prisma.marketData.findMany({
      orderBy: { date: 'asc' },
      select: { date: true, marketPrice: true },
      where: { symbol: aSymbol }
    });
  }

  public async getValue(
    aOrders: CreateOrderDto[],
    aDate: Date,
    aBaseCurrency: Currency
  ): Promise<Data> {
    const ordersWithPlatform: OrderWithPlatform[] = aOrders.map((order) => {
      return {
        ...order,
        createdAt: new Date(),
        date: parseISO(order.date),
        fee: 0,
        id: undefined,
        platformId: undefined,
        type: Type.BUY,
        updatedAt: undefined,
        userId: undefined
      };
    });

    const portfolio = new Portfolio(
      this.dataProviderService,
      this.exchangeRateDataService,
      this.rulesService
    );
    await portfolio.setOrders(ordersWithPlatform);

    return {
      currency: aBaseCurrency,
      value: portfolio.getValue(aDate)
    };
  }
}
