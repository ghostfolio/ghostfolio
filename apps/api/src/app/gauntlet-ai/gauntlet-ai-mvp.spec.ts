import { AgentChatRequestDto } from './contracts/agent-chat.dto';
import { InMemorySessionStore } from './memory/in-memory-session.store';
import { GauntletAiOrchestratorService } from './orchestrator/gauntlet-ai-orchestrator.service';
import { AllocationBreakdownTool } from './tools/allocation-breakdown.tool';
import { ConcentrationVerificationService } from './verification/concentration-verification.service';

describe('Gauntlet AI MVP', () => {
  it('keeps bounded in-memory chat history', () => {
    const store = new InMemorySessionStore();

    for (let i = 0; i < 25; i++) {
      store.append('session-1', {
        content: `message-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: i
      });
    }

    const session = store.getSession('session-1');
    expect(session).toHaveLength(20);
    expect(session[0].content).toBe('message-5');
  });

  it('computes allocation breakdown by assets and sectors', async () => {
    const tool = new AllocationBreakdownTool();

    const output = await tool.execute({
      message: 'show allocation',
      portfolioDetails: {
        holdings: {
          AAPL: {
            allocationInPercentage: 0.3,
            sectors: [{ name: 'Technology', weight: 1 }],
            symbol: 'AAPL'
          },
          VOO: {
            allocationInPercentage: 0.2,
            sectors: [{ name: 'Technology', weight: 0.4 }],
            symbol: 'VOO'
          }
        }
      } as any,
      sessionId: 's-1',
      userId: 'u-1'
    });

    expect(output.assets[0].key).toBe('AAPL');
    expect(output.sectors[0].key).toBe('Technology');
    expect(output.sectors[0].percentage).toBeCloseTo(0.38, 6);
  });

  it('flags concentration risks on threshold breaches', () => {
    const verificationService = new ConcentrationVerificationService();

    const result = verificationService.verify({
      assets: [
        { key: 'AAPL', percentage: 0.31 },
        { key: 'MSFT', percentage: 0.2 }
      ],
      sectors: [{ key: 'Technology', percentage: 0.45 }]
    });

    expect(result.confidence).toBe('medium');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('retries a failed tool once and still responds', async () => {
    let attempts = 0;
    const tool = {
      execute: jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('temporary failure');
        }

        return {
          summary: {},
          topHoldings: [{ symbol: 'AAPL' }],
          totalPositions: 1
        };
      }),
      name: 'portfolio_analysis'
    };

    const orchestrator = new GauntletAiOrchestratorService(
      {
        generateText: jest.fn().mockResolvedValue({ text: 'ok' }),
        generateTextWithSystem: jest
          .fn()
          .mockResolvedValue({
            text: '["portfolio_analysis", "allocation_breakdown"]'
          })
      } as any,
      new ConcentrationVerificationService(),
      new InMemorySessionStore(),
      {
        getDetails: jest.fn().mockResolvedValue({
          hasErrors: false,
          holdings: {},
          summary: {}
        })
      } as any,
      {
        getTool: jest.fn().mockReturnValue(tool),
        listToolNames: jest.fn().mockReturnValue(['portfolio_analysis'])
      } as any
    );

    const request: AgentChatRequestDto = {
      message: 'analyze my portfolio',
      sessionId: 'session-1'
    };

    const response = await orchestrator.orchestrate(request, {
      languageCode: 'en',
      userCurrency: 'USD',
      userId: 'user-1'
    });

    expect(response.answer).toBe('ok');
    expect(tool.execute).toHaveBeenCalledTimes(2);
    expect(response.toolRuns[0].status).toBe('success');
  });

  it('returns graceful fallback when LLM synthesis fails', async () => {
    const orchestrator = new GauntletAiOrchestratorService(
      {
        generateText: jest.fn().mockRejectedValue(new Error('llm down')),
        generateTextWithSystem: jest.fn().mockResolvedValue({
          text: '["portfolio_analysis", "allocation_breakdown", "risk_flags"]'
        })
      } as any,
      new ConcentrationVerificationService(),
      new InMemorySessionStore(),
      {
        getDetails: jest.fn().mockResolvedValue({
          hasErrors: false,
          holdings: {},
          summary: {}
        })
      } as any,
      {
        getTool: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue({
            summary: {},
            topHoldings: [],
            totalPositions: 0
          }),
          name: 'portfolio_analysis'
        }),
        listToolNames: jest.fn().mockReturnValue(['portfolio_analysis'])
      } as any
    );

    const response = await orchestrator.orchestrate(
      {
        message: 'status',
        sessionId: 'session-2'
      },
      {
        languageCode: 'en',
        userCurrency: 'USD',
        userId: 'user-1'
      }
    );

    expect(response.answer).toContain('Unable to generate analysis');
    expect(response.warnings.some((warning) => warning.includes('LLM synthesis failed'))).toBe(true);
  });
});
