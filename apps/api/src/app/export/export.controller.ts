import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { Export } from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  public constructor(
    private readonly exportService: ExportService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async export(
    @Query('activityIds') activityIds?: string[]
  ): Promise<Export> {
    return this.exportService.export({
      activityIds,
      userCurrency: this.request.user.Settings.settings.baseCurrency,
      userId: this.request.user.id
    });
  }
}
