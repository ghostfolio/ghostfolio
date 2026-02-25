import { Injectable } from '@nestjs/common';

import type { AgentToolName } from '../contracts/agent-chat.types';

import { AllocationBreakdownTool } from './allocation-breakdown.tool';
import type { AgentTool } from './agent-tool.interface';
import { PortfolioAnalysisTool } from './portfolio-analysis.tool';
import { RiskFlagsTool } from './risk-flags.tool';

@Injectable()
export class ToolRegistryService {
  private readonly tools: Record<AgentToolName, AgentTool>;

  public constructor(
    allocationBreakdownTool: AllocationBreakdownTool,
    portfolioAnalysisTool: PortfolioAnalysisTool,
    riskFlagsTool: RiskFlagsTool
  ) {
    this.tools = {
      allocation_breakdown: allocationBreakdownTool,
      portfolio_analysis: portfolioAnalysisTool,
      risk_flags: riskFlagsTool
    };
  }

  public getTool(name: AgentToolName): AgentTool {
    return this.tools[name];
  }

  public listToolNames(): AgentToolName[] {
    return Object.keys(this.tools) as AgentToolName[];
  }
}
