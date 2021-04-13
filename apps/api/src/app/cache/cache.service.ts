import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class CacheService {
  public constructor(private prisma: PrismaService) {}

  public async flush(aUserId: string): Promise<void> {
    await this.prisma.property.deleteMany({
      where: {
        OR: [{ key: 'LAST_DATA_GATHERING' }, { key: 'LOCKED_DATA_GATHERING' }]
      }
    });

    return;
  }
}
