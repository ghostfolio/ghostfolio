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
    .optional()
    .describe('The types of the activities to get'),
  assetClasses: z
    .array(z.enum(AssetClass))
    .optional()
    .describe('The asset classes of the activities to get'),
  dataSource: z
    .enum(DataSource)
    .optional()
    .describe(
      'The data source of the asset profile, which only takes effect together with the symbol'
    ),
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
  symbol: z
    .string()
    .optional()
    .describe(
      'The symbol of the asset profile, which only takes effect together with the data source'
    ),
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
    description: `Gives the activities of the portfolio, the most recent first, with these columns: ${AiService.getActivitiesTableColumnNames().join(
      ', '
    )}. The columns with a monetary value are omitted if the access does not grant to read them. At most ${MCP_MAX_ACTIVITIES} activities are given per call, hence narrow the result with the parameters or get the further activities with the skip parameter.`,
    name: 'get-activities',
    parameters: GET_ACTIVITIES_PARAMETERS
  })
  public async getActivities(
    @Impersonation()
    {
      filters,
      scopes: scopesOfAccess,
      userId,
      userSettings
    }: ImpersonationContext,
    @Payload()
    {
      activityTypes,
      assetClasses,
      dataSource,
      range,
      skip,
      symbol,
      take
    }: z.infer<typeof GET_ACTIVITIES_PARAMETERS>
  ) {
    let endDate: Date;
    let startDate: Date;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filtersOfAccess = filters ?? [];

    const typesOfFiltersOfAccess = new Set(
      filtersOfAccess.map(({ type }) => {
        return type;
      })
    );

    // A filter of the tool is dropped if the access already restricts its
    // type, because the filters of a type are combined with a logical or and
    // a tool must never widen the access
    const filtersOfTool = this.apiService
      .buildFiltersFromQueryParams({
        filterByAssetClasses: assetClasses?.join(','),
        filterByDataSource: dataSource,
        filterBySymbol: symbol
      })
      .filter(({ type }) => {
        return !typesOfFiltersOfAccess.has(type);
      });

    const table = await this.aiService.getActivitiesTable({
      endDate,
      skip,
      startDate,
      userId,
      filters: [...filtersOfAccess, ...filtersOfTool],
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
    @Impersonation() { filters, userId, userSettings }: ImpersonationContext
  ) {
    const prompt = await this.aiService.getPrompt({
      filters,
      userId,
      languageCode: DEFAULT_LANGUAGE_CODE,
      mode: 'portfolio',
      userCurrency: userSettings.baseCurrency
    });

    return { content: [{ text: prompt, type: 'text' as const }] };
  }
}
