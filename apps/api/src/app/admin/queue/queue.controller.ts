import { AdminJobs } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JobStatus } from 'bull';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { QueueService } from './queue.service';

@Controller('admin/queue')
export class QueueController {
  public constructor(
    private readonly queueService: QueueService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete('job')
  @UseGuards(AuthGuard('jwt'))
  public async deleteJobs(
    @Query('status') filterByStatus?: string
  ): Promise<void> {
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

    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.deleteJobs({ status });
  }

  @Get('job')
  @UseGuards(AuthGuard('jwt'))
  public async getJobs(
    @Query('status') filterByStatus?: string
  ): Promise<AdminJobs> {
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

    const status = <JobStatus[]>filterByStatus?.split(',') ?? undefined;
    return this.queueService.getJobs({ status });
  }

  @Delete('job/:id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteJob(@Param('id') id: string): Promise<void> {
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

    return this.queueService.deleteJob(id);
  }
}
