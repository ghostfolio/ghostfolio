import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_asset_profile');

export function createGetAssetProfileTool(deps: ToolDependencies) {
  return tool(
    'get_asset_profile',
    'Get asset profile: sectors, countries, ETF holdings, identifiers.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "VTI", "SPY")')
    },
    async ({ dataSource, symbol }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_asset_profile',
          { dataSource, symbol }
        );
        const result = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          async () => {
            const profiles = await withTimeout(
              deps.symbolProfileService.getSymbolProfiles([
                { dataSource: dataSource as DataSource, symbol }
              ])
            );

            if (!profiles || profiles.length === 0) {
              return null;
            }

            const profile = profiles[0];

            const data: Record<string, unknown> = {
              symbol: profile.symbol,
              name: profile.name,
              assetClass: profile.assetClass,
              assetSubClass: profile.assetSubClass,
              currency: profile.currency
            };

            if (profile.isin) data.isin = profile.isin;
            if (profile.cusip) data.cusip = profile.cusip;
            if (profile.figi) data.figi = profile.figi;

            if (profile.countries?.length) {
              data.countries = profile.countries.slice(0, 15);
            }

            if (profile.sectors?.length) {
              data.sectors = profile.sectors;
            }

            if (profile.holdings?.length) {
              data.topHoldings = profile.holdings.slice(0, 15);
            }

            if (profile.activitiesCount !== undefined) {
              data.activitiesCount = profile.activitiesCount;
            }

            if (profile.dateOfFirstActivity) {
              data.dateOfFirstActivity = profile.dateOfFirstActivity;
            }

            return data;
          }
        );

        if (!result) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: true,
                  type: 'not_found',
                  message: `No profile found for ${symbol} on ${dataSource}`
                })
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ assetProfile: result })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_asset_profile',
          ...classified
        });
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: true,
                type: classified.type,
                message: classified.userMessage
              })
            }
          ]
        };
      }
    },
    { annotations: { readOnlyHint: true } }
  );
}
