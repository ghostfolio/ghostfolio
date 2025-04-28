import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { WatchlistResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreateWatchlistItemDto } from './create-watchlist-item.dto';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
export class WatchlistController {
  public constructor(
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly watchlistService: WatchlistService
  ) {}

  @Post()
  @HasPermission(permissions.createWatchlistItem)
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createWatchlistItem(@Body() data: CreateWatchlistItemDto) {
    return this.watchlistService.createWatchlistItem({
      dataSource: data.dataSource,
      symbol: data.symbol,
      userId: this.request.user.id
    });
  }

  @Delete(':dataSource/:symbol')
  @HasPermission(permissions.deleteWatchlistItem)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteWatchlistItem(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ) {
    const watchlistItem = await this.watchlistService
      .getWatchlistItems(this.request.user.id)
      .then((watchlist) => {
        return watchlist.find((item) => {
          return item.dataSource === dataSource && item.symbol === symbol;
        });
      });

    if (!watchlistItem) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.watchlistService.deleteWatchlistItem({
      dataSource,
      symbol,
      userId: this.request.user.id
    });
  }

  @Get()
  @HasPermission(permissions.readWatchlist)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getWatchlistItems(): Promise<WatchlistResponse> {
    const watchlist = await this.watchlistService.getWatchlistItems(
      this.request.user.id
    );

    return {
      watchlist
    };
  }
}
