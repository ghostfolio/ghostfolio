import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { DataSource } from '@ghostfolio/prisma/enums';

import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Res,
  UseInterceptors
} from '@nestjs/common';
import { Response } from 'express';
import ms from 'ms';

import { GetLogoDto } from './get-logo.dto';
import { LogoService } from './logo.service';

@Controller('logo')
export class LogoController {
  private static readonly CACHE_MAX_AGE_IN_SECONDS = ms('7 days') / 1000;

  public constructor(private readonly logoService: LogoService) {}

  @Get(':dataSource/:symbol')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getLogoByDataSourceAndSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string,
    @Res() response: Response
  ) {
    try {
      const { buffer, type } =
        await this.logoService.getLogoByDataSourceAndSymbol({
          dataSource,
          symbol
        });

      response.contentType(type);

      response.setHeader(
        'Cache-Control',
        `public, max-age=${LogoController.CACHE_MAX_AGE_IN_SECONDS}`
      );

      response.send(buffer);
    } catch {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Get()
  public async getLogoByUrl(
    @Query() { url }: GetLogoDto,
    @Res() response: Response
  ) {
    try {
      const { buffer, type } = await this.logoService.getLogoByUrl(url);

      response.contentType(type);

      response.setHeader(
        'Cache-Control',
        `public, max-age=${LogoController.CACHE_MAX_AGE_IN_SECONDS}`
      );

      response.send(buffer);
    } catch {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }
}
