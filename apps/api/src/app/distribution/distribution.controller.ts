import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { CreateDistributionDto } from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { DistributionService } from './distribution.service';

@Controller('distribution')
export class DistributionController {
  public constructor(
    private readonly distributionService: DistributionService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createDistribution)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createDistribution(@Body() data: CreateDistributionDto) {
    return this.distributionService.createDistribution({
      userId: this.request.user.id,
      data: {
        partnershipId: data.partnershipId,
        entityId: data.entityId,
        type: data.type,
        amount: data.amount,
        date: data.date,
        currency: data.currency,
        taxWithheld: data.taxWithheld,
        notes: data.notes
      }
    });
  }

  @Get()
  @HasPermission(permissions.readDistribution)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getDistributions(
    @Query('entityId') entityId?: string,
    @Query('partnershipId') partnershipId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string
  ) {
    return this.distributionService.getDistributions({
      userId: this.request.user.id,
      entityId,
      partnershipId,
      type,
      startDate,
      endDate,
      groupBy
    });
  }

  @Delete(':distributionId')
  @HasPermission(permissions.deleteDistribution)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteDistribution(
    @Param('distributionId') distributionId: string
  ) {
    return this.distributionService.deleteDistribution({
      distributionId,
      userId: this.request.user.id
    });
  }
}
