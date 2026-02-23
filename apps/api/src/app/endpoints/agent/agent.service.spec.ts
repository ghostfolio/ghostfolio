import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Test, TestingModule } from '@nestjs/testing';

import { AgentTraceService } from './agent-trace.service';
import { AgentService, verifyAgentOutput } from './agent.service';

describe('verifyAgentOutput', () => {
  it('should fail verification for empty content', () => {
    const { content, verification } = verifyAgentOutput('');
    expect(content).toBe('');
    expect(verification.passed).toBe(false);
    expect(verification.type).toBe('output_validation');
  });

  it('should pass and add source attribution when content has financial numbers', () => {
    const { content, verification } = verifyAgentOutput('Your allocation is 60% in stocks.');
    expect(verification.passed).toBe(true);
    expect(verification.type).toBe('source_attribution');
    expect(content).toContain('Source: your Ghostfolio data.');
  });

  it('should pass without suffix when content already has source attribution', () => {
    const text = 'Based on your portfolio data, you have 50% in equity.';
    const { content, verification } = verifyAgentOutput(text);
    expect(verification.passed).toBe(true);
    expect(content).toBe(text);
  });

  it('should pass output_validation for non-financial response', () => {
    const { content, verification } = verifyAgentOutput('How can I help you today?');
    expect(verification.passed).toBe(true);
    expect(verification.type).toBe('output_validation');
    expect(content).not.toContain('Source:');
  });
});

describe('AgentService', () => {
  let service: AgentService;

  const mockPortfolioService = {
    getDetails: jest.fn(),
    getPerformance: jest.fn()
  };
  const mockOrderService = { getOrders: jest.fn() };
  const mockDataProviderService = { getQuotes: jest.fn() };
  const mockPropertyService = {
    getByKey: jest.fn().mockImplementation((key: string) => {
      if (key === PROPERTY_API_KEY_OPENROUTER) return Promise.resolve('test-key');
      if (key === PROPERTY_OPENROUTER_MODEL) return Promise.resolve('openai/gpt-4o');
      return Promise.resolve(undefined);
    })
  };
  const mockUserService = {
    user: jest.fn().mockResolvedValue({ settings: { settings: { baseCurrency: 'USD' } } })
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        AgentTraceService,
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: OrderService, useValue: mockOrderService },
        { provide: DataProviderService, useValue: mockDataProviderService },
        { provide: PropertyService, useValue: mockPropertyService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should return error response when OpenRouter is not configured', async () => {
    (mockPropertyService.getByKey as jest.Mock).mockResolvedValue(undefined);
    const result = await service.chat({
      userId: 'user-1',
      messages: [{ role: 'user', content: 'What is my allocation?' }]
    });
    expect(result.message.content).toContain('not configured');
    expect(result.verification?.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
