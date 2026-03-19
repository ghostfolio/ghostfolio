import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { CreatePlatformDto, UpdatePlatformDto } from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Platform } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  public constructor(private readonly platformService: PlatformService) {}

  @Get()
  @HasPermission(permissions.readPlatformsWithAccountCount)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms() {
    return this.platformService.getPlatformsWithAccountCount();
  }

  @HasPermission(permissions.createPlatform)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<Platform> {
    return this.platformService.createPlatform(data);
  }

  @HasPermission(permissions.updatePlatform)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
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
  @HasPermission(permissions.deletePlatform)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
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
