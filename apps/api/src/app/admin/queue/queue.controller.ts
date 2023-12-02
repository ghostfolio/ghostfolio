import { AdminJobs } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JobStatus } from 'bull';

import { QueueService } from './queue.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';

@Controller('admin/queue')
export class QueueController {
  public constructor(
    private readonly queueService: QueueService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete('job')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async deleteJobs(
    @Query('status') filterByStatus?: string
  ): Promise<void> {
    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.deleteJobs({ status });
  }

  @Get('job')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async getJobs(
    @Query('status') filterByStatus?: string
  ): Promise<AdminJobs> {
    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.getJobs({ status });
  }

  @Delete('job/:id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async deleteJob(@Param('id') id: string): Promise<void> {
    return this.queueService.deleteJob(id);
  }
}
