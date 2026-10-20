import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PlatformService } from '@ghostfolio/api/services/platform/platform.service';
import { CreatePlatformDto, UpdatePlatformDto } from '@ghostfolio/common/dtos';
import {
  PlatformResponse,
  PlatformsResponse
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { pick } from 'lodash-es';

@AllowDuringImpersonation()
@Controller('platforms')
export class PlatformsController {
  public constructor(
    private readonly platformService: PlatformService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createPlatform)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<PlatformResponse> {
    const platform = await this.platformService.createPlatform(data);

    return pick(platform, ['id', 'name', 'url']);
  }

  @Delete(':id')
  @HasPermission(permissions.deletePlatform)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deletePlatform(@Param('id') id: string): Promise<void> {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.platformService.deletePlatform({ id });
  }

  @Get()
  @HasPermission(permissions.readPlatforms)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms(): Promise<PlatformsResponse> {
    if (
      hasPermission(
        this.request.user.permissions,
        permissions.readPlatformsWithAccountCount
      )
    ) {
      const platforms = await this.platformService.getPlatformsWithAccountCount(
        {
          orderBy: { name: 'asc' }
        }
      );

      return { platforms };
    }

    const platforms = await this.platformService.getPlatforms({
      orderBy: { name: 'asc' }
    });

    return {
      platforms: platforms.map((platform) => {
        return pick(platform, ['id', 'name', 'url']);
      })
    };
  }

  @HasPermission(permissions.updatePlatform)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updatePlatform(
    @Param('id') id: string,
    @Body() data: UpdatePlatformDto
  ): Promise<PlatformResponse> {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const platform = await this.platformService.updatePlatform({
      data: {
        ...data
      },
      where: {
        id
      }
    });

    return pick(platform, ['id', 'name', 'url']);
  }
}
