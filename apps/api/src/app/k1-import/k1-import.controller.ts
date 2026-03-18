import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StatusCodes } from 'http-status-codes';

import { K1ImportService } from './k1-import.service';

@Controller('api/v1/k1-import')
export class K1ImportController {
  public constructor(
    private readonly k1ImportService: K1ImportService,
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
   * GET /api/v1/k1-import/:id
   * Get the current state of an import session.
   */
  @HasPermission(permissions.readKDocument)
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getImportSession(@Param('id') id: string) {
    return this.k1ImportService.getSession(id, this.request.user.id);
  }
}
