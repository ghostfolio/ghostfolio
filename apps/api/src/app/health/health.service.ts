import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';

@Injectable()
export class HealthService {
  public constructor(
    private readonly dataProviderService: DataProviderService
  ) {}

  public async hasResponseFromDataProvider(aDataSource: DataSource) {
    return this.dataProviderService.checkQuote(aDataSource);
  }
}
