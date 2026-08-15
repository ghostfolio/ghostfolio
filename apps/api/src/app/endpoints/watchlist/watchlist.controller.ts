import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { CreateWatchlistItemDto } from '@ghostfolio/common/dtos';
import { WatchlistResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
export class WatchlistController {
  public constructor(private readonly watchlistService: WatchlistService) {}

  @Post()
  @HasPermission(permissions.createWatchlistItem)
  @RequiresScope(scopes.watchlistCreate)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createWatchlistItem(
    @Body() data: CreateWatchlistItemDto,
    @Impersonation() { userId }: ImpersonationContext
  ) {
    return this.watchlistService.createWatchlistItem({
      userId,
      dataSource: data.dataSource,
      symbol: data.symbol
    });
  }

  @Delete(':dataSource/:symbol')
  @HasPermission(permissions.deleteWatchlistItem)
  @RequiresScope(scopes.watchlistDelete)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteWatchlistItem(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ) {
    const watchlistItems =
      await this.watchlistService.getWatchlistItems(userId);

    const watchlistItem = watchlistItems.find((item) => {
      return item.dataSource === dataSource && item.symbol === symbol;
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
      userId
    });
  }

  @Get()
  @HasPermission(permissions.readWatchlist)
  @RequiresScope(scopes.watchlistRead)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getWatchlistItems(
    @Impersonation() { userId }: ImpersonationContext
  ): Promise<WatchlistResponse> {
    const watchlist = await this.watchlistService.getWatchlistItems(userId);

    return {
      watchlist
    };
  }
}
