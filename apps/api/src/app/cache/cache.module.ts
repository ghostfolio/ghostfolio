import { Module } from '@nestjs/common';

import { PrismaService } from '../../services/prisma.service';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [CacheController],
  providers: [CacheService, PrismaService]
})
export class CacheModule {}
