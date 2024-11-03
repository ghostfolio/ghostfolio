import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
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

import { GhostfolioService } from './ghostfolio.service';

@Controller('data-providers/ghostfolio')
export class GhostfolioController {
  public constructor(
    private readonly ghostfolioService: GhostfolioService,
    private readonly prismaService: PrismaService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('lookup')
  @HasPermission(permissions.enableDataProviderGhostfolio)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async lookupSymbol(
    @Query('includeIndices') includeIndicesParam = 'false',
    @Query('query') query = ''
  ): Promise<{ items: LookupItem[] }> {
    const includeIndices = includeIndicesParam === 'true';

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
