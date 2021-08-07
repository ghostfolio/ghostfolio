import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async flush(): Promise<void> {
    await this.prismaService.property.deleteMany({
      where: {
        OR: [{ key: 'LAST_DATA_GATHERING' }, { key: 'LOCKED_DATA_GATHERING' }]
      }
    });

    return;
  }
}
