import { Controller } from '@nestjs/common';

import { PrismaService } from '../services/prisma.service';
import { RedisCacheService } from './redis-cache/redis-cache.service';

@Controller()
export class AppController {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService
  ) {
    this.initialize();
  }

  private async initialize() {
    this.redisCacheService.reset();

    const isDataGatheringLocked = await this.prismaService.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    if (!isDataGatheringLocked) {
      // Prepare for automatical data gather if not locked
      await this.prismaService.property.deleteMany({
        where: {
          OR: [{ key: 'LAST_DATA_GATHERING' }, { key: 'LOCKED_DATA_GATHERING' }]
        }
      });
    }
  }
}
