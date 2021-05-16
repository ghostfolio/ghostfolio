import { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

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
  public async lookupSymbol(@Query() { query }): Promise<LookupItem[]> {
    try {
      return this.symbolService.lookup(query);
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
  @Get(':symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getPosition(@Param('symbol') symbol): Promise<SymbolItem> {
    return this.symbolService.get(symbol);
  }
}
