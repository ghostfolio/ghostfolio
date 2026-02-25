import { Injectable } from '@nestjs/common';

import type { AgentTool, AgentToolContext } from './agent-tool.interface';

interface RiskFlagsOutput {
  flags: string[];
}

@Injectable()
export class RiskFlagsTool implements AgentTool<RiskFlagsOutput> {
  public readonly name = 'risk_flags' as const;

  public async execute({ portfolioDetails }: AgentToolContext): Promise<RiskFlagsOutput> {
    const summary = portfolioDetails.summary;
    const flags: string[] = [];

    if (!summary) {
      return {
        flags: ['Portfolio summary is unavailable; risk view may be incomplete.']
      };
    }

    if ((summary.totalInvestment ?? 0) <= 0) {
      flags.push('No active investment detected in portfolio summary.');
    }

    if ((summary.netPerformancePercentageWithCurrencyEffect ?? 0) < -0.1) {
      flags.push('Portfolio drawdown exceeds 10% in net performance percentage.');
    }

    if ((summary.filteredValueInPercentage ?? 1) < 0.6) {
      flags.push('Current filtered portfolio exposure appears lower than expected.');
    }

    if (flags.length === 0) {
      flags.push(
        'No additional deterministic risk flags detected beyond concentration checks.'
      );
    }

    return { flags };
  }
}
