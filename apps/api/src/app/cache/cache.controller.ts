import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Controller('cache')
export class CacheController {
  public constructor(
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('flush')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl) // permission needed
  public async flushCache(): Promise<void> {
    return this.redisCacheService.reset();
  }
}
