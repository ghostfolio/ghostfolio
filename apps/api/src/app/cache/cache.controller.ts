import { Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';

import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  public constructor(
    private readonly cacheService: CacheService,
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {
    this.redisCacheService.reset();
  }

  @Post('flush')
  @UseGuards(AuthGuard('jwt'))
  public async flushCache(): Promise<void> {
    this.redisCacheService.reset();

    return this.cacheService.flush(this.request.user.id);
  }
}
