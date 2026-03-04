import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { compactJson } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:refresh_market_data');

export function createRefreshMarketDataTool(deps: ToolDependencies) {
  return tool(
    'refresh_market_data',
    'Refresh market data for a specific symbol.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "AAPL")')
    },
    async ({ dataSource, symbol }) => {
      try {
        await withTimeout(
          deps.dataGatheringService.gatherSymbol({
            dataSource: dataSource as DataSource,
            symbol
          }),
          15_000
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                success: true,
                symbol,
                dataSource,
                message: `Market data refresh job enqueued for ${symbol}. Data will be updated shortly.`
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'refresh_market_data',
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
    { annotations: { readOnlyHint: false, destructiveHint: false } }
  );
}
