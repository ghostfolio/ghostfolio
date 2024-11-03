import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Controller,
  Get,
  HttpException,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { GhostfolioService } from './ghostfolio.service';

@Controller('data-providers/ghostfolio')
export class GhostfolioController {
  public constructor(private readonly ghostfolioService: GhostfolioService) {}

  @Get('lookup')
  @HasPermission(permissions.enableDataProviderGhostfolio)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async lookupSymbol(
    @Query('includeIndices') includeIndicesParam = 'false',
    @Query('query') query = ''
  ): Promise<{ items: LookupItem[] }> {
    const includeIndices = includeIndicesParam === 'true';

    try {
      return this.ghostfolioService.lookup({
        includeIndices,
        query: query.toLowerCase()
      });
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
