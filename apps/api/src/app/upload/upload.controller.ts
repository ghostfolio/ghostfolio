import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentType } from '@prisma/client';
import type { Response } from 'express';

import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  public constructor(
    private readonly uploadService: UploadService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.uploadDocument)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(FileInterceptor('file'))
  public async uploadDocument(@UploadedFile() file: any) {
    const body = this.request.body as any;

    const validDocumentTypes = Object.values(DocumentType);

    if (!body.type || !validDocumentTypes.includes(body.type as DocumentType)) {
      throw new BadRequestException(
        `type must be one of: ${validDocumentTypes.join(', ')}`
      );
    }

    return this.uploadService.createDocument({
      file,
      entityId: body.entityId,
      name: body.name,
      partnershipId: body.partnershipId,
      taxYear: body.taxYear ? Number(body.taxYear) : undefined,
      type: body.type as DocumentType
    });
  }

  @Get(':id/download')
  @HasPermission(permissions.readDocument)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { document, stream } = await this.uploadService.getDocumentStream(id);

    res.set({
      'Content-Disposition': `attachment; filename="${document.name}"`,
      'Content-Type': document.mimeType || 'application/octet-stream'
    });

    if (document.fileSize) {
      res.set('Content-Length', document.fileSize.toString());
    }

    stream.pipe(res);
  }
}
