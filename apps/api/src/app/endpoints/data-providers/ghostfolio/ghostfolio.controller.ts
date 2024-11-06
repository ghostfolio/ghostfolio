import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS } from '@ghostfolio/common/config';
import {
  DataProviderGhostfolioStatusResponse,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  HttpException,
  Inject,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { GetQuotesDto } from './get-quotes.dto';
import { GhostfolioService } from './ghostfolio.service';

@Controller('data-providers/ghostfolio')
export class GhostfolioController {
  public constructor(
    private readonly ghostfolioService: GhostfolioService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  // TODO: Get historical

  @Get('lookup')
  @HasPermission(permissions.enableDataProviderGhostfolio)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async lookupSymbol(
    @Query('includeIndices') includeIndicesParam = 'false',
    @Query('query') query = ''
  ): Promise<LookupResponse> {
    const includeIndices = includeIndicesParam === 'true';
    const maxDailyRequests = await this.getMaxDailyRequests();

    if (
      this.request.user.dataProviderGhostfolioDailyRequests > maxDailyRequests
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
        StatusCodes.TOO_MANY_REQUESTS
      );
    }

    try {
      const result = await this.ghostfolioService.lookup({
        includeIndices,
        query: query.toLowerCase()
      });

      await this.incrementDailyRequests({
        userId: this.request.user.id
      });

      return result;
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('quotes')
  @HasPermission(permissions.enableDataProviderGhostfolio)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getQuotes(
    @Query() query: GetQuotesDto
  ): Promise<QuotesResponse> {
    const maxDailyRequests = await this.getMaxDailyRequests();

    if (
      this.request.user.dataProviderGhostfolioDailyRequests > maxDailyRequests
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
        StatusCodes.TOO_MANY_REQUESTS
      );
    }

    try {
      const quotes = await this.ghostfolioService.getQuotes({
        symbols: query.symbols
      });

      await this.incrementDailyRequests({
        userId: this.request.user.id
      });

      return quotes;
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  @HasPermission(permissions.enableDataProviderGhostfolio)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getStatus(): Promise<DataProviderGhostfolioStatusResponse> {
    return {
      dailyRequests: this.request.user.dataProviderGhostfolioDailyRequests,
      dailyRequestsMax: await this.getMaxDailyRequests()
    };
  }

  private async getMaxDailyRequests() {
    return parseInt(
      ((await this.propertyService.getByKey(
        PROPERTY_DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS
      )) as string) || '0',
      10
    );
  }

  private async incrementDailyRequests({ userId }: { userId: string }) {
    await this.prismaService.analytics.update({
      data: {
        dataProviderGhostfolioDailyRequests: { increment: 1 },
        lastRequestAt: new Date()
      },
      where: { userId }
    });
  }
}
