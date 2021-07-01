import { Currency } from '@prisma/client';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';

export class CurrentRateService {

  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private prisma: PrismaService
  ) {}

  /**
   * TODO: @dtslvr
   */
  public async getValue({date, symbol, currency, userCurrency}: GetValueParams): Promise<number> {
    const marketData = await this.prisma.marketData.findFirst({
      select: { date: true, marketPrice: true },
      where: { date: date, symbol: symbol }
    });

    console.log(marketData); // { date: Date, marketPrice: number }

    return this.exchangeRateDataService.toCurrency(
      marketData.marketPrice,
      currency,
      userCurrency
    );
  }

}

export interface GetValueParams {
  date: Date;
  symbol: string;
  currency: Currency;
  userCurrency: Currency;
}
