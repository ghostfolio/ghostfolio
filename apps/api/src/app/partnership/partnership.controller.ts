import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { FamilyOfficeBenchmarkService } from '@ghostfolio/api/services/benchmark/family-office-benchmark.service';
import {
  CreatePartnershipAssetDto,
  CreatePartnershipDto,
  CreatePartnershipMembershipDto,
  CreatePartnershipValuationDto,
  UpdatePartnershipDto
} from '@ghostfolio/common/dtos';
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
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { PartnershipService } from './partnership.service';

@Controller('partnership')
export class PartnershipController {
  public constructor(
    private readonly familyOfficeBenchmarkService: FamilyOfficeBenchmarkService,
    private readonly partnershipService: PartnershipService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createPartnership)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createPartnership(@Body() data: CreatePartnershipDto) {
    return this.partnershipService.createPartnership({
      name: data.name,
      type: data.type as any,
      inceptionDate: new Date(data.inceptionDate),
      fiscalYearEnd: data.fiscalYearEnd ?? 12,
      currency: data.currency,
      user: { connect: { id: this.request.user.id } }
    });
  }

  @Get()
  @HasPermission(permissions.readPartnership)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPartnerships() {
    return this.partnershipService.getPartnerships({
      userId: this.request.user.id
    });
  }

  @Get(':partnershipId')
  @HasPermission(permissions.readPartnership)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPartnershipById(
    @Param('partnershipId') partnershipId: string
  ) {
    return this.partnershipService.getPartnershipById({
      partnershipId,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Put(':partnershipId')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updatePartnership(
    @Param('partnershipId') partnershipId: string,
    @Body() data: UpdatePartnershipDto
  ) {
    return this.partnershipService.updatePartnership({
      partnershipId,
      userId: this.request.user.id,
      data
    });
  }

  @Delete(':partnershipId')
  @HasPermission(permissions.deletePartnership)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deletePartnership(
    @Param('partnershipId') partnershipId: string
  ) {
    return this.partnershipService.deletePartnership({
      partnershipId,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Post(':partnershipId/member')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async addMember(
    @Param('partnershipId') partnershipId: string,
    @Body() data: CreatePartnershipMembershipDto
  ) {
    return this.partnershipService.addMember({
      partnershipId,
      userId: this.request.user.id,
      data: {
        entityId: data.entityId,
        ownershipPercent: data.ownershipPercent,
        capitalCommitment: data.capitalCommitment,
        capitalContributed: data.capitalContributed,
        classType: data.classType,
        effectiveDate: data.effectiveDate
      }
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Put(':partnershipId/member/:membershipId')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateMember(
    @Param('partnershipId') partnershipId: string,
    @Param('membershipId') membershipId: string,
    @Body() data: any
  ) {
    return this.partnershipService.updateMember({
      partnershipId,
      membershipId,
      userId: this.request.user.id,
      data
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Post(':partnershipId/valuation')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async recordValuation(
    @Param('partnershipId') partnershipId: string,
    @Body() data: CreatePartnershipValuationDto
  ) {
    return this.partnershipService.recordValuation({
      partnershipId,
      userId: this.request.user.id,
      data: {
        date: data.date,
        nav: data.nav,
        source: data.source,
        notes: data.notes
      }
    });
  }

  @Get(':partnershipId/valuations')
  @HasPermission(permissions.readPartnership)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getValuations(
    @Param('partnershipId') partnershipId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.partnershipService.getValuations({
      partnershipId,
      userId: this.request.user.id,
      startDate,
      endDate
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Post(':partnershipId/asset')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async addAsset(
    @Param('partnershipId') partnershipId: string,
    @Body() data: CreatePartnershipAssetDto
  ) {
    return this.partnershipService.addAsset({
      partnershipId,
      userId: this.request.user.id,
      data: {
        name: data.name,
        assetType: data.assetType,
        description: data.description,
        acquisitionDate: data.acquisitionDate,
        acquisitionCost: data.acquisitionCost,
        currentValue: data.currentValue,
        currency: data.currency,
        metadata: data.metadata
      }
    });
  }

  @HasPermission(permissions.updatePartnership)
  @Post(':partnershipId/asset/:assetId/valuation')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async addAssetValuation(
    @Param('partnershipId') partnershipId: string,
    @Param('assetId') assetId: string,
    @Body()
    data: { date: string; value: number; source: string; notes?: string }
  ) {
    return this.partnershipService.addAssetValuation({
      partnershipId,
      assetId,
      userId: this.request.user.id,
      data
    });
  }

  @Get(':partnershipId/performance')
  @HasPermission(permissions.readPartnership)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPerformance(
    @Param('partnershipId') partnershipId: string,
    @Query('benchmarks') benchmarks?: string,
    @Query('endDate') endDate?: string,
    @Query('periodicity') periodicity?: string,
    @Query('startDate') startDate?: string
  ) {
    const result = await this.partnershipService.getPerformance({
      endDate,
      partnershipId,
      periodicity: periodicity as any,
      startDate,
      userId: this.request.user.id
    });

    // If benchmarks requested, compute comparisons
    if (benchmarks) {
      const benchmarkIds = benchmarks.split(',').map((b) => b.trim());
      const overallReturn =
        result.periods.length > 0
          ? result.periods.reduce(
              (acc, p) => (1 + acc) * (1 + p.returnPercent) - 1,
              0
            )
          : 0;

      const partnership = await this.partnershipService.getPartnershipById({
        partnershipId,
        userId: this.request.user.id
      });

      const comparisons =
        await this.familyOfficeBenchmarkService.computeBenchmarkComparisons({
          benchmarkIds,
          endDate: endDate ? new Date(endDate) : new Date(),
          partnershipReturn: overallReturn,
          startDate: startDate
            ? new Date(startDate)
            : new Date(partnership.inceptionDate)
        });

      result.benchmarkComparisons = comparisons;
    }

    return result;
  }
}
