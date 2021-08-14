import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RequestWithUser } from '@ghostfolio/common/types';
import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

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

    return this.cacheService.flush();
  }
}
