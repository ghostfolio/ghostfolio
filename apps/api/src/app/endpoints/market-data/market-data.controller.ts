import { AdminService } from '@ghostfolio/api/app/admin/admin.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  ghostfolioFearAndGreedIndexDataSource,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import { getCurrencyFromSymbol, isCurrency } from '@ghostfolio/common/helper';
import {
  MarketDataDetailsResponse,
  MarketDataOfMarketsResponse
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { UpdateBulkMarketDataDto } from './update-bulk-market-data.dto';

@Controller('market-data')
export class MarketDataController {
  public constructor(
    private readonly adminService: AdminService,
    private readonly marketDataService: MarketDataService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly symbolService: SymbolService
  ) {}

  @Get('markets')
  @HasPermission(permissions.readMarketDataOfMarkets)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getMarketDataOfMarkets(
    @Query('includeHistoricalData') includeHistoricalData = 0
  ): Promise<MarketDataOfMarketsResponse> {
    const [
      marketDataFearAndGreedIndexCryptocurrencies,
      marketDataFearAndGreedIndexStocks
    ] = await Promise.all([
      this.symbolService.get({
        includeHistoricalData,
        dataGatheringItem: {
          dataSource: 'MANUAL',
          symbol: 'GF_FEAR_AND_GREED_INDEX_CRYPTO'
        }
      }),
      this.symbolService.get({
        includeHistoricalData,
        dataGatheringItem: {
          dataSource: ghostfolioFearAndGreedIndexDataSource,
          symbol: ghostfolioFearAndGreedIndexSymbol
        }
      })
    ]);

    return {
      CRYPTOCURRENCIES: {
        ...marketDataFearAndGreedIndexCryptocurrencies
      },
      STOCKS: {
        ...marketDataFearAndGreedIndexStocks
      }
    };
  }

  @Get(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getMarketDataBySymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<MarketDataDetailsResponse> {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile && !isCurrency(getCurrencyFromSymbol(symbol))) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const canReadAllAssetProfiles = hasPermission(
      this.request.user.permissions,
      permissions.readMarketData
    );

    const canReadOwnAssetProfile =
      assetProfile?.userId === this.request.user.id &&
      hasPermission(
        this.request.user.permissions,
        permissions.readMarketDataOfOwnAssetProfile
      );

    if (!canReadAllAssetProfiles && !canReadOwnAssetProfile) {
      throw new HttpException(
        assetProfile.userId
          ? getReasonPhrase(StatusCodes.NOT_FOUND)
          : getReasonPhrase(StatusCodes.FORBIDDEN),
        assetProfile.userId ? StatusCodes.NOT_FOUND : StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.getMarketDataBySymbol({ dataSource, symbol });
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
