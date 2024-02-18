import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';

import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Res,
  UseInterceptors
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Response } from 'express';

import { LogoService } from './logo.service';

@Controller('logo')
export class LogoController {
  public constructor(private readonly logoService: LogoService) {}

  @Get(':dataSource/:symbol')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getLogoByDataSourceAndSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string,
    @Res() response: Response
  ) {
    try {
      const buffer = await this.logoService.getLogoByDataSourceAndSymbol({
        dataSource,
        symbol
      });

      response.contentType('image/png');
      response.send(buffer);
    } catch {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Get()
  public async getLogoByUrl(
    @Query('url') url: string,
    @Res() response: Response
  ) {
    try {
      const buffer = await this.logoService.getLogoByUrl(url);

      response.contentType('image/png');
      response.send(buffer);
    } catch {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }
}
