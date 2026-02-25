import type { PortfolioDetails } from '@ghostfolio/common/interfaces';

import type { AgentToolName } from '../contracts/agent-chat.types';

export interface AgentToolContext {
  message: string;
  portfolioDetails: PortfolioDetails & { hasErrors: boolean };
  sessionId: string;
  userId: string;
}

export interface AgentTool<TOutput = unknown> {
  execute(context: AgentToolContext): Promise<TOutput>;
  name: AgentToolName;
}
