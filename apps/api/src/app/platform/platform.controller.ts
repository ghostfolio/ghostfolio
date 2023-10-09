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
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<Platform> {
    if (
      !hasPermission(this.request.user.permissions, permissions.createPlatform)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.platformService.createPlatform(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async updatePlatform(
    @Param('id') id: string,
    @Body() data: UpdatePlatformDto
  ) {
    if (
      !hasPermission(this.request.user.permissions, permissions.updatePlatform)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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
  public async deletePlatform(@Param('id') id: string) {
    if (
      !hasPermission(this.request.user.permissions, permissions.deletePlatform)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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
