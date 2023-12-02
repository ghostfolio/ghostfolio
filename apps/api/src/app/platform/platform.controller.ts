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
import { Platform } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreatePlatformDto } from './create-platform.dto';
import { PlatformService } from './platform.service';
import { UpdatePlatformDto } from './update-platform.dto';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';

@Controller('platform')
export class PlatformController {
  public constructor(
    private readonly platformService: PlatformService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getPlatforms() {
    return this.platformService.getPlatformsWithAccountCount();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.createPlatform)
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<Platform> {
    return this.platformService.createPlatform(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.updatePlatform)
  public async updatePlatform(
    @Param('id') id: string,
    @Body() data: UpdatePlatformDto
  ) {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.platformService.updatePlatform({
      data: {
        ...data
      },
      where: {
        id
      }
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.deletePlatform)
  public async deletePlatform(@Param('id') id: string) {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.platformService.deletePlatform({ id });
  }
}
