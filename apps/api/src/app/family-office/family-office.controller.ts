import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { FamilyOfficeService } from './family-office.service';

@Controller('family-office')
export class FamilyOfficeController {
  public constructor(
    private readonly familyOfficeService: FamilyOfficeService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('dashboard')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getDashboard() {
    return this.familyOfficeService.getDashboard({
      userId: this.request.user.id
    });
  }

  @Get('portfolio-summary')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPortfolioSummary(
    @Query('quarter') quarter?: string,
    @Query('valuationYear') valuationYear?: string
  ) {
    const year = valuationYear
      ? parseInt(valuationYear, 10)
      : new Date().getFullYear();

    return this.familyOfficeService.getPortfolioSummary({
      quarter: quarter ? parseInt(quarter, 10) : undefined,
      userId: this.request.user.id,
      valuationYear: year
    });
  }

  @Get('asset-class-summary')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAssetClassSummary(
    @Query('quarter') quarter?: string,
    @Query('valuationYear') valuationYear?: string
  ) {
    const year = valuationYear
      ? parseInt(valuationYear, 10)
      : new Date().getFullYear();

    return this.familyOfficeService.getAssetClassSummary({
      quarter: quarter ? parseInt(quarter, 10) : undefined,
      userId: this.request.user.id,
      valuationYear: year
    });
  }

  @Get('activity')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getActivity(
    @Query('entityId') entityId?: string,
    @Query('partnershipId') partnershipId?: string,
    @Query('year') year?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.familyOfficeService.getActivity({
      entityId,
      partnershipId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      userId: this.request.user.id,
      year: year ? parseInt(year, 10) : undefined
    });
  }

  @Get('report')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getReport(
    @Query('benchmarks') benchmarks?: string,
    @Query('entityId') entityId?: string,
    @Query('period') period?: string,
    @Query('periodNumber') periodNumber?: string,
    @Query('year') year?: string
  ) {
    if (!period || !year) {
      return {
        error: 'period and year are required query parameters'
      };
    }

    const validPeriods = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

    if (!validPeriods.includes(period)) {
      return {
        error: `period must be one of: ${validPeriods.join(', ')}`
      };
    }

    const yearNum = parseInt(year, 10);
    const periodNum = periodNumber ? parseInt(periodNumber, 10) : undefined;

    const benchmarkIds = benchmarks
      ? benchmarks.split(',').map((b) => b.trim())
      : undefined;

    return this.familyOfficeService.generateReport({
      benchmarkIds,
      entityId,
      period: period as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
      periodNumber: periodNum,
      userId: this.request.user.id,
      year: yearNum
    });
  }
}
