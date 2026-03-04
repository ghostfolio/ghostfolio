import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:export_portfolio');

export function createExportPortfolioTool(deps: ToolDependencies) {
  return tool(
    'export_portfolio',
    'Export portfolio activities as structured data.',
    {
      activityIds: z
        .array(z.string().uuid())
        .optional()
        .describe(
          'Export only specific activities by ID. If omitted, exports all.'
        )
    },
    async ({ activityIds }) => {
      try {
        const userSettings = deps.user.settings?.settings ?? {};

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'export_portfolio',
          { activityIds }
        );

        const exportData = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () =>
            withTimeout(
              deps.exportService.export({
                activityIds,
                filters: [],
                userId: deps.user.id,
                userSettings: userSettings as any
              }),
              30_000
            )
        );

        // Cap activities to prevent context inflation
        if (exportData?.activities?.length > 200) {
          const totalCount = exportData.activities.length;
          exportData.activities = exportData.activities.slice(0, 200);
          (exportData as any)._truncated = true;
          (exportData as any)._totalCount = totalCount;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson(exportData)
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'export_portfolio',
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
