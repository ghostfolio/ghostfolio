import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateBulkMarketDataDto } from '@ghostfolio/common/dtos';
import { getCurrencyFromSymbol, isCurrency } from '@ghostfolio/common/helper';
import { MarketDataOfMarketsResponse } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

@Controller('market-data')
export class MarketDataController {
  public constructor(
    private readonly marketDataService: MarketDataService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly symbolService: SymbolService
  ) {}

  @Get('markets')
  @HasPermission(permissions.readMarketDataOfMarkets)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getMarketDataOfMarkets(
    @Query('includeHistoricalData', new ParseIntPipe({ optional: true }))
    includeHistoricalData = 0
  ): Promise<MarketDataOfMarketsResponse> {
    return this.symbolService.getMarketDataOfMarkets({
      includeHistoricalData
    });
  }

  @Post(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async updateMarketData(
    @Body() data: UpdateBulkMarketDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ) {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile && !isCurrency(getCurrencyFromSymbol(symbol))) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const canUpsertAllAssetProfiles =
      hasPermission(
        this.request.user.permissions,
        permissions.createMarketData
      ) &&
      hasPermission(
        this.request.user.permissions,
        permissions.updateMarketData
      );

    const canUpsertOwnAssetProfile =
      assetProfile?.userId === this.request.user.id &&
      hasPermission(
        this.request.user.permissions,
        permissions.createMarketDataOfOwnAssetProfile
      ) &&
      hasPermission(
        this.request.user.permissions,
        permissions.updateMarketDataOfOwnAssetProfile
      );

    if (!canUpsertAllAssetProfiles && !canUpsertOwnAssetProfile) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const dataBulkUpdate: Prisma.MarketDataUpdateInput[] = data.marketData.map(
      ({ date, marketPrice }) => ({
        dataSource,
        marketPrice,
        symbol,
        date: parseISO(date),
        state: 'CLOSE'
      })
    );

    return this.marketDataService.updateMany({
      data: dataBulkUpdate
    });
  }
}
