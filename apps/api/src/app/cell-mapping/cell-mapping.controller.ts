import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CellMappingService } from './cell-mapping.service';

@Controller('cell-mapping')
export class CellMappingController {
  public constructor(
    private readonly cellMappingService: CellMappingService
  ) {}

  /**
   * GET /api/v1/cell-mapping
   * Get cell mappings for a partnership (with global defaults).
   */
  @HasPermission(permissions.readKDocument)
  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getMappings(
    @Query('partnershipId') partnershipId?: string
  ) {
    return this.cellMappingService.getMappings(partnershipId);
  }

  /**
   * PUT /api/v1/cell-mapping
   * Update or create cell mappings for a partnership.
   */
  @HasPermission(permissions.updateKDocument)
  @Put()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateMappings(
    @Body()
    data: {
      partnershipId: string;
      mappings: Array<{
        boxNumber: string;
        label: string;
        description?: string;
        isCustom: boolean;
      }>;
    }
  ) {
    return this.cellMappingService.updateMappings(
      data.partnershipId,
      data.mappings
    );
  }

  /**
   * DELETE /api/v1/cell-mapping/reset
   * Reset a partnership's cell mappings to IRS defaults.
   */
  @HasPermission(permissions.updateKDocument)
  @Delete('reset')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async resetMappings(
    @Query('partnershipId') partnershipId: string
  ) {
    return this.cellMappingService.resetMappings(partnershipId);
  }

  /**
   * GET /api/v1/cell-mapping/aggregation-rules
   * Get aggregation rules for a partnership.
   */
  @HasPermission(permissions.readKDocument)
  @Get('aggregation-rules')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAggregationRules(
    @Query('partnershipId') partnershipId?: string
  ) {
    return this.cellMappingService.getAggregationRules(partnershipId);
  }

  /**
   * PUT /api/v1/cell-mapping/aggregation-rules
   * Update aggregation rules for a partnership.
   */
  @HasPermission(permissions.updateKDocument)
  @Put('aggregation-rules')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateAggregationRules(
    @Body()
    data: {
      partnershipId: string;
      rules: Array<{
        name: string;
        operation: string;
        sourceCells: string[];
      }>;
    }
  ) {
    return this.cellMappingService.updateAggregationRules(
      data.partnershipId,
      data.rules
    );
  }

  /**
   * GET /api/v1/cell-mapping/aggregation-rules/compute
   * Compute aggregation values for a specific KDocument (FR-036).
   */
  @HasPermission(permissions.readKDocument)
  @Get('aggregation-rules/compute')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async computeAggregations(
    @Query('kDocumentId') kDocumentId: string,
    @Query('partnershipId') partnershipId?: string
  ) {
    return this.cellMappingService.computeAggregations(
      kDocumentId,
      partnershipId
    );
  }
}
