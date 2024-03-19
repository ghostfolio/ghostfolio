import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { isDate, isEmpty } from 'lodash';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';
import { SymbolService } from './symbol.service';

@Controller('symbol')
export class SymbolController {
  public constructor(
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolService: SymbolService
  ) {}

  /**
   * Must be before /:symbol
   */
  @Get('lookup')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async lookupSymbol(
    @Query('includeIndices') includeIndicesParam = 'false',
    @Query('query') query = ''
  ): Promise<{ items: LookupItem[] }> {
    const includeIndices = includeIndicesParam === 'true';

    try {
      return this.symbolService.lookup({
        includeIndices,
        query: query.toLowerCase(),
        user: this.request.user
      });
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
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getSymbolData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string,
    @Query('includeHistoricalData') includeHistoricalData = 0
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async gatherSymbolForDate(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<IDataProviderHistoricalResponse> {
    const date = parseISO(dateString);

    if (!isDate(date)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    const result = await this.symbolService.getForDate({
      dataSource,
      date,
      symbol
    });

    if (!result || isEmpty(result)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return result;
  }
}
