import { Export } from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
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
  @UseGuards(AuthGuard('jwt'))
  public async export(): Promise<Export> {
    return await this.exportService.export({
      userId: this.request.user.id
    });
  }
}
