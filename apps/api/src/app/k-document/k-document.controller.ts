import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import {
  CreateKDocumentDto,
  UpdateKDocumentDto
} from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { KDocumentStatus, KDocumentType } from '@prisma/client';

import { KDocumentService } from './k-document.service';

@Controller('k-document')
export class KDocumentController {
  public constructor(
    private readonly kDocumentService: KDocumentService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createKDocument)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createKDocument(@Body() data: CreateKDocumentDto) {
    return this.kDocumentService.createKDocument({
      data: data.data,
      filingStatus: data.filingStatus,
      partnershipId: data.partnershipId,
      taxYear: data.taxYear,
      type: data.type,
      userId: this.request.user.id
    });
  }

  @Get()
  @HasPermission(permissions.readKDocument)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getKDocuments(
    @Query('filingStatus') filingStatus?: KDocumentStatus,
    @Query('partnershipId') partnershipId?: string,
    @Query('taxYear') taxYear?: string,
    @Query('type') type?: KDocumentType
  ) {
    return this.kDocumentService.getKDocuments({
      filingStatus,
      partnershipId,
      taxYear: taxYear ? parseInt(taxYear, 10) : undefined,
      type,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updateKDocument)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateKDocument(
    @Body() data: UpdateKDocumentDto,
    @Param('id') id: string
  ) {
    return this.kDocumentService.updateKDocument({
      data: data.data,
      filingStatus: data.filingStatus,
      kDocumentId: id,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updateKDocument)
  @Post(':id/link-document')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async linkDocument(
    @Body('documentId') documentId: string,
    @Param('id') id: string
  ) {
    return this.kDocumentService.linkDocument({
      documentId,
      kDocumentId: id,
      userId: this.request.user.id
    });
  }
}
