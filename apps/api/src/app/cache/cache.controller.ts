import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  HttpException,
  Inject,
  Post,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Controller('cache')
export class CacheController {
  public constructor(
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('flush')
  @UseGuards(AuthGuard('jwt'))
  public async flushCache(): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.redisCacheService.reset();
  }
}
