import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  Inject,
  Param,
  ParseBoolPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { isDate, isEmpty } from 'lodash';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';
import { SymbolService } from './symbol.service';

@Controller('symbol')
export class SymbolController {
  public constructor(
    private readonly symbolService: SymbolService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  /**
   * Must be before /:symbol
   */
  @Get('lookup')
  @UseGuards(AuthGuard('jwt'))
  public async lookupSymbol(
    @Query() { query = '' }
  ): Promise<{ items: LookupItem[] }> {
    try {
      return this.symbolService.lookup(query.toLowerCase());
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Must be after /lookup
   */
  @Get(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getSymbolData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string,
    @Query('includeHistoricalData', new DefaultValuePipe(false), ParseBoolPipe)
    includeHistoricalData: boolean
  ): Promise<SymbolItem> {
    if (!DataSource[dataSource]) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const result = await this.symbolService.get({
      includeHistoricalData,
      dataGatheringItem: { dataSource, symbol }
    });

    if (!result || isEmpty(result)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return result;
  }

  @Get(':dataSource/:symbol/:dateString')
  @UseGuards(AuthGuard('jwt'))
  public async gatherSymbolForDate(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<IDataProviderHistoricalResponse> {
    const date = new Date(dateString);

    if (!isDate(date)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    return this.symbolService.getForDate({
      dataSource,
      date,
      symbol
    });
  }
}
