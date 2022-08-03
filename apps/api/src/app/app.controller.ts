import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Controller } from '@nestjs/common';

@Controller()
export class AppController {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService
  ) {
    this.initialize();
  }

  private async initialize() {
    try {
      await this.prismaService.$connect();
      await this.exchangeRateDataService.initialize();
    } catch {}
  }
}
