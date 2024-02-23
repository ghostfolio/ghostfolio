import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { AdminJobs } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JobStatus } from 'bull';

import { QueueService } from './queue.service';

@Controller('admin/queue')
export class QueueController {
  public constructor(private readonly queueService: QueueService) {}

  @Delete('job')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteJobs(
    @Query('status') filterByStatus?: string
  ): Promise<void> {
    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.deleteJobs({ status });
  }

  @Get('job')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getJobs(
    @Query('status') filterByStatus?: string
  ): Promise<AdminJobs> {
    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.getJobs({ status });
  }

  @Delete('job/:id')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteJob(@Param('id') id: string): Promise<void> {
    return this.queueService.deleteJob(id);
  }
}
