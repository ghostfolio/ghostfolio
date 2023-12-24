import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { permissions } from '@ghostfolio/common/permissions';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('cache')
export class CacheController {
  public constructor(private readonly redisCacheService: RedisCacheService) {}

  @Post('flush')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async flushCache(): Promise<void> {
    return this.redisCacheService.reset();
  }
}
