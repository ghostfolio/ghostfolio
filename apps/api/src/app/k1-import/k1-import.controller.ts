import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StatusCodes } from 'http-status-codes';

import { ConfirmK1Dto } from './dto/confirm-k1.dto';
import { VerifyK1Dto } from './dto/verify-k1.dto';
import { K1ImportService } from './k1-import.service';
import { K1MaterializedViewService } from './k1-materialized-view.service';

@Controller('k1-import')
export class K1ImportController {
  public constructor(
    private readonly k1ImportService: K1ImportService,
    private readonly k1MaterializedViewService: K1MaterializedViewService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  /**
   * POST /api/v1/k1-import/upload
   * Upload a K-1 PDF and initiate extraction.
   */
  @HasPermission(permissions.createKDocument)
  @Post('upload')
  @HttpCode(StatusCodes.CREATED)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(FileInterceptor('file'))
  public async uploadK1(@UploadedFile() file: any) {
    const body = this.request.body as any;
    const taxYear = parseInt(body.taxYear, 10);

    return this.k1ImportService.uploadAndExtract({
      file,
      partnershipId: body.partnershipId,
      taxYear,
      userId: this.request.user.id
    });
  }

  /**
   * GET /api/v1/k1-import/history
   * Get import history for a partnership.
   */
  @HasPermission(permissions.readKDocument)
  @Get('history')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getImportHistory(
    @Query('partnershipId') partnershipId: string,
    @Query('taxYear') taxYear?: string
  ) {
    return this.k1ImportService.getHistory(
      this.request.user.id,
      partnershipId,
      taxYear ? parseInt(taxYear, 10) : undefined
    );
  }

  /**
   * GET /api/v1/k1-import/:id
   * Get the current state of an import session.
   */
  @HasPermission(permissions.readKDocument)
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getImportSession(@Param('id') id: string) {
    return this.k1ImportService.getSession(id, this.request.user.id);
  }

  /**
   * PUT /api/v1/k1-import/:id/verify
   * Submit user-verified extraction data.
   */
  @HasPermission(permissions.updateKDocument)
  @Put(':id/verify')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async verifyImportSession(
    @Param('id') id: string,
    @Body() data: VerifyK1Dto
  ) {
    return this.k1ImportService.verify(id, this.request.user.id, data);
  }

  /**
   * POST /api/v1/k1-import/:id/cancel
   * Cancel an import session.
   */
  @HasPermission(permissions.updateKDocument)
  @Post(':id/cancel')
  @HttpCode(StatusCodes.OK)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async cancelImportSession(@Param('id') id: string) {
    return this.k1ImportService.cancel(id, this.request.user.id);
  }

  /**
   * POST /api/v1/k1-import/:id/reprocess
   * Re-process a previously uploaded K-1 PDF with current cell mapping.
   */
  @HasPermission(permissions.updateKDocument)
  @Post(':id/reprocess')
  @HttpCode(StatusCodes.OK)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async reprocessImportSession(@Param('id') id: string) {
    return this.k1ImportService.reprocess(id, this.request.user.id);
  }

  /**
   * POST /api/v1/k1-import/:id/confirm
   * Confirm verified data and trigger auto-creation of model objects.
   */
  @HasPermission(permissions.createKDocument)
  @Post(':id/confirm')
  @HttpCode(StatusCodes.CREATED)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async confirmImportSession(
    @Param('id') id: string,
    @Body() data: ConfirmK1Dto
  ) {
    return this.k1ImportService.confirm(id, this.request.user.id, data);
  }

  /**
   * GET /api/v1/k1-import/summary/:partnershipId/:taxYear
   * Get partnership-year K-1 summary from materialized view.
   */
  @HasPermission(permissions.readKDocument)
  @Get('summary/:partnershipId/:taxYear')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPartnershipYearSummary(
    @Param('partnershipId') partnershipId: string,
    @Param('taxYear') taxYear: string
  ) {
    return this.k1MaterializedViewService.getPartnershipYearSummary(
      partnershipId,
      parseInt(taxYear, 10)
    );
  }
}
