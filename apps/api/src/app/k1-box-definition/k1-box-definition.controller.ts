import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes } from 'http-status-codes';

import { K1BoxDefinitionService } from './k1-box-definition.service';
import { DEFAULT_AGGREGATION_RULES } from './k1-box-definition.service';

@Controller('k1/box-definitions')
export class K1BoxDefinitionController {
  public constructor(
    private readonly k1BoxDefinitionService: K1BoxDefinitionService
  ) {}

  /**
   * GET /api/v1/k1/box-definitions/aggregation-rules
   * List all default aggregation rules.
   * Must be before :boxKey route to avoid being caught by it.
   */
  @HasPermission(permissions.readKDocument)
  @Get('aggregation-rules')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public getAggregationRules() {
    return DEFAULT_AGGREGATION_RULES.map((rule, index) => ({
      ruleId: `default-${index + 1}`,
      name: rule.name,
      operation: rule.operation,
      sourceBoxKeys: [...rule.sourceBoxKeys],
      sortOrder: rule.sortOrder
    }));
  }

  /**
   * GET /api/v1/k1/box-definitions
   * List all box definitions, optionally filtered by section.
   */
  @HasPermission(permissions.readKDocument)
  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAll(@Query('section') section?: string) {
    return this.k1BoxDefinitionService.getAll(section);
  }

  /**
   * GET /api/v1/k1/box-definitions/resolved/:partnershipId
   * Get resolved definitions (merged with overrides) for a partnership.
   * Must be before :boxKey route to avoid being caught by it.
   */
  @HasPermission(permissions.readKDocument)
  @Get('resolved/:partnershipId')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getResolved(
    @Param('partnershipId') partnershipId: string
  ) {
    return this.k1BoxDefinitionService.resolve(partnershipId);
  }

  /**
   * GET /api/v1/k1/box-definitions/:boxKey
   * Get a single box definition by key.
   */
  @HasPermission(permissions.readKDocument)
  @Get(':boxKey')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getByKey(@Param('boxKey') boxKey: string) {
    return this.k1BoxDefinitionService.getByKey(boxKey);
  }

  /**
   * POST /api/v1/k1/box-definitions/overrides
   * Create or update a K1BoxOverride for a partnership.
   */
  @HasPermission(permissions.readKDocument)
  @HttpCode(StatusCodes.OK)
  @Post('overrides')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async upsertOverride(
    @Body()
    body: {
      boxKey: string;
      partnershipId: string;
      customLabel?: string;
      isIgnored?: boolean;
    }
  ) {
    return this.k1BoxDefinitionService.upsertOverride(
      body.boxKey,
      body.partnershipId,
      {
        customLabel: body.customLabel,
        isIgnored: body.isIgnored
      }
    );
  }
}
