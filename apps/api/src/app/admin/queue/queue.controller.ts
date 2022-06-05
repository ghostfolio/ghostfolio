import { AdminJobs } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Get,
  HttpException,
  Inject,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { QueueService } from './queue.service';

@Controller('admin/queue')
export class QueueController {
  public constructor(
    private readonly queueService: QueueService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('jobs')
  @UseGuards(AuthGuard('jwt'))
  public async getJobs(): Promise<AdminJobs> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.queueService.getJobs({});
  }
}
