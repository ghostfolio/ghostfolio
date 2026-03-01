import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_user_settings');

export function createGetUserSettingsTool(deps: ToolDependencies) {
  return tool(
    'get_user_settings',
    'Get current user settings and preferences.',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_user_settings',
          {}
        );

        const exposedSettings = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          async () => {
            const settings = deps.user.settings?.settings ?? {};

            return {
              baseCurrency: settings.baseCurrency,
              benchmark: settings.benchmark,
              language: settings.language,
              locale: settings.locale,
              dateRange: settings.dateRange,
              viewMode: settings.viewMode,
              holdingsViewMode: settings.holdingsViewMode,
              emergencyFund: settings.emergencyFund,
              savingsRate: settings.savingsRate,
              projectedTotalAmount: settings.projectedTotalAmount,
              retirementDate: settings.retirementDate,
              safeWithdrawalRate: settings.safeWithdrawalRate,
              annualInterestRate: settings.annualInterestRate
            };
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ settings: exposedSettings })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_user_settings',
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
