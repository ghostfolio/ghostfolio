import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExperimentalService {
  public constructor(
    private readonly accountService: AccountService,
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
}
