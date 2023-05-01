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
import { PlatformService } from './platform.service';
import { AuthGuard } from '@nestjs/passport';
import { Platform } from '@prisma/client';
import { CreatePlatformDto } from './create-platform.dto';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';
import { REQUEST } from '@nestjs/core';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { UpdatePlatformDto } from './update-platform.dto';

@Controller('platform')
export class PlatformController {
  public constructor(
    private platformService: PlatformService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getPlatforms(): Promise<Platform[]> {
    return this.platformService.getPlatforms();
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
    console.log('id', id);
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
