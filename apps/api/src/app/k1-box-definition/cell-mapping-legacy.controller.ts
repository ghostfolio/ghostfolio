/**
 * Legacy redirect controller for /api/v1/cell-mapping/* routes.
 *
 * The old CellMapping module was replaced by K1BoxDefinition in spec 006.
 * This controller ensures any stale PWA bundles or cached clients hitting
 * the old /cell-mapping/* paths still get a response (301 redirect to the
 * new /k1/box-definitions/* routes).
 */
import { Controller, Get, Query, Redirect } from '@nestjs/common';

@Controller('cell-mapping')
export class CellMappingLegacyController {
  @Get()
  @Redirect('/api/v1/k1/box-definitions', 301)
  public getAll(@Query('section') section?: string) {
    if (section) {
      return { url: `/api/v1/k1/box-definitions?section=${section}` };
    }
  }

  @Get('aggregation-rules')
  @Redirect('/api/v1/k1/box-definitions/aggregation-rules', 301)
  public getAggregationRules() {
    // Default redirect target already set by decorator
  }

  @Get('aggregation-rules/compute')
  @Redirect('/api/v1/k1/box-definitions/aggregation-rules', 301)
  public computeAggregationRules() {
    // Legacy compute endpoint → redirect to rules list
  }
}
