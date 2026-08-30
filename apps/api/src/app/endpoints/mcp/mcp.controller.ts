import { AiService } from '@ghostfolio/api/app/endpoints/ai/ai.service';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScopeOfAccess } from '@ghostfolio/api/decorators/requires-scope-of-access.decorator';
import { DATE_RANGE_PATTERN } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DATE_RANGES,
  DEFAULT_LANGUAGE_CODE,
  MCP_MAX_ACTIVITIES
} from '@ghostfolio/common/config';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { UseFilters } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { AssetClass, DataSource, Type as ActivityType } from '@prisma/client';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const GET_ACTIVITIES_PARAMETERS = z.object({
  activityTypes: z
    .array(z.enum(ActivityType))
    .min(1)
    .optional()
    .describe('The types of the activities to get'),
  assetClasses: z
    .array(z.enum(AssetClass))
    .min(1)
    .optional()
    .describe('The asset classes of the activities to get'),
  holding: z
    .object({
      dataSource: z
        .enum(DataSource)
        .describe('The data source of the asset profile'),
      symbol: z.string().describe('The symbol of the asset profile')
    })
    .optional()
    .describe('The asset profile of the activities to get'),
  range: z
    .string()
    .regex(DATE_RANGE_PATTERN)
    .optional()
    .describe(
      `The date range of the activities to get, either ${DATE_RANGES.join(
        ', '
      )} or a calendar year like 2024`
    ),
  skip: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('The number of activities to skip'),
  take: z
    .number()
    .int()
    .min(1)
    .max(MCP_MAX_ACTIVITIES)
    .optional()
    .describe(`The number of activities to get, at most ${MCP_MAX_ACTIVITIES}`)
});

@McpController()
@UseFilters(McpToolExceptionFilter)
export class GhostfolioMcpController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService
  ) {}

  @RequiresScopeOfAccess(scopes.activityRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get activities'
    },
    description: `Gives the activities of the portfolio, the most recent first, with these columns: ${AiService.getActivitiesTableColumnNames(
      { withValues: false }
    ).join(
      ', '
    )}. More columns with a monetary value are added if the access grants to read them. At most ${MCP_MAX_ACTIVITIES} activities are given per call, hence narrow the result with the parameters or get the further activities with the skip parameter.`,
    name: 'get-activities',
    parameters: GET_ACTIVITIES_PARAMETERS
  })
  public async getActivities(
    @Impersonation()
    { scopes: scopesOfAccess, userId, userSettings }: ImpersonationContext,
    @Payload()
    {
      activityTypes,
      assetClasses,
      holding,
      range,
      skip,
      take
    }: z.infer<typeof GET_ACTIVITIES_PARAMETERS>
  ) {
    let endDate: Date | undefined;
    let startDate: Date | undefined;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetClasses: assetClasses?.join(','),
      filterByDataSource: holding?.dataSource,
      filterBySymbol: holding?.symbol
    });

    const table = await this.aiService.getActivitiesTable({
      endDate,
      filters,
      skip,
      startDate,
      userId,
      take: take ?? MCP_MAX_ACTIVITIES,
      types: activityTypes,
      userCurrency: userSettings.baseCurrency,
      withValues: hasScope(scopesOfAccess, scopes.portfolioReadValues)
    });

    return { content: [{ text: table, type: 'text' as const }] };
  }

  @RequiresScopeOfAccess(scopes.portfolioRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get portfolio'
    },
    description: `Gives the holdings of the portfolio with these columns: ${AiService.getHoldingsTableColumnNames().join(
      ', '
    )}.`,
    name: 'get-portfolio'
  })
  public async getPortfolio(
    @Impersonation() { userId, userSettings }: ImpersonationContext
  ) {
    const prompt = await this.aiService.getPrompt({
      userId,
      languageCode: DEFAULT_LANGUAGE_CODE,
      mode: 'portfolio',
      userCurrency: userSettings.baseCurrency
    });

    return { content: [{ text: prompt, type: 'text' as const }] };
  }
}
