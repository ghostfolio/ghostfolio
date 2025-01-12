import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/data-enhancer.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_CURRENCIES } from '@ghostfolio/common/config';

import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';

@Injectable()
export class HealthService {
  public constructor(
    private readonly dataEnhancerService: DataEnhancerService,
    private readonly dataProviderService: DataProviderService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  public async hasResponseFromDataEnhancer(aName: string) {
    return this.dataEnhancerService.enhance(aName);
  }

  public async hasResponseFromDataProvider(aDataSource: DataSource) {
    return this.dataProviderService.checkQuote(aDataSource);
  }

  public async isDatabaseHealthy() {
    try {
      await this.propertyService.getByKey(PROPERTY_CURRENCIES);

      return true;
    } catch {
      return false;
    }
  }

  public async isRedisCacheHealthy() {
    try {
      const isHealthy = await this.redisCacheService.isHealthy();

      return isHealthy;
    } catch {
      return false;
    }
  }
}
