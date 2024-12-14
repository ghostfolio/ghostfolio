import { AdminService } from '@ghostfolio/api/app/admin/admin.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { MarketDataDetailsResponse } from '@ghostfolio/common/interfaces';
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
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getMarketDataBySymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<MarketDataDetailsResponse> {
    if (
      !hasPermission(this.request.user.permissions, permissions.readMarketData)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
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
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.createMarketData
      ) ||
      !hasPermission(
        this.request.user.permissions,
        permissions.updateMarketData
      )
    ) {
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
