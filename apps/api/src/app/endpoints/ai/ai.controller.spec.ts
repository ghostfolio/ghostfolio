import { REQUEST } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiService } from '@ghostfolio/api/services/api/api.service';

import { AiController } from './ai.controller';
import { AiFeedbackService } from './ai-feedback.service';
import { AiChatDto } from './ai-chat.dto';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let aiService: {
    chat: jest.Mock;
    getPrompt: jest.Mock;
  };
  let aiFeedbackService: { submitFeedback: jest.Mock };
  let apiService: { buildFiltersFromQueryParams: jest.Mock };

  beforeEach(async () => {
    aiService = {
      chat: jest.fn(),
      getPrompt: jest.fn()
    };
    aiFeedbackService = {
      submitFeedback: jest.fn()
    };
    apiService = {
      buildFiltersFromQueryParams: jest.fn()
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: aiService
        },
        {
          provide: AiFeedbackService,
          useValue: aiFeedbackService
        },
        {
          provide: ApiService,
          useValue: apiService
        },
        {
          provide: REQUEST,
          useValue: {
            user: {
              id: 'user-controller',
              settings: {
                settings: {
                  baseCurrency: 'USD',
                  language: 'en'
                }
              }
            }
          }
        }
      ]
    }).compile();

    controller = moduleRef.get(AiController);
  });

  it('passes validated chat payload and user context to ai service', async () => {
    const dto: AiChatDto = {
      query: 'Analyze my portfolio',
      sessionId: 'chat-session-1',
      symbols: ['AAPL']
    };

    aiService.chat.mockResolvedValue({
      answer: 'ok',
      citations: [],
      confidence: { band: 'medium', score: 0.7 },
      memory: { sessionId: 'chat-session-1', turns: 1 },
      toolCalls: [],
      verification: []
    });

    await controller.chat(dto);

    expect(aiService.chat).toHaveBeenCalledWith({
      languageCode: 'en',
      query: dto.query,
      sessionId: dto.sessionId,
      symbols: dto.symbols,
      userCurrency: 'USD',
      userId: 'user-controller'
    });
  });

  it('builds filters via api service before calling prompt generation', async () => {
    const filters = [{ key: 'symbol', value: 'AAPL' }];
    apiService.buildFiltersFromQueryParams.mockReturnValue(filters);
    aiService.getPrompt.mockResolvedValue('prompt-body');

    const response = await controller.getPrompt(
      'portfolio',
      'account-1',
      undefined,
      undefined,
      undefined,
      'tag-1'
    );

    expect(apiService.buildFiltersFromQueryParams).toHaveBeenCalledWith({
      filterByAccounts: 'account-1',
      filterByAssetClasses: undefined,
      filterByDataSource: undefined,
      filterBySymbol: undefined,
      filterByTags: 'tag-1'
    });
    expect(aiService.getPrompt).toHaveBeenCalledWith({
      filters,
      impersonationId: undefined,
      languageCode: 'en',
      mode: 'portfolio',
      userCurrency: 'USD',
      userId: 'user-controller'
    });
    expect(response).toEqual({
      prompt: 'prompt-body'
    });
  });

  it('passes feedback payload and user context to ai service', async () => {
    aiFeedbackService.submitFeedback.mockResolvedValue({
      accepted: true,
      feedbackId: 'feedback-1'
    });

    const response = await controller.submitFeedback({
      comment: 'Helpful answer',
      rating: 'up',
      sessionId: 'chat-session-1'
    });

    expect(aiFeedbackService.submitFeedback).toHaveBeenCalledWith({
      comment: 'Helpful answer',
      rating: 'up',
      sessionId: 'chat-session-1',
      userId: 'user-controller'
    });
    expect(response).toEqual({
      accepted: true,
      feedbackId: 'feedback-1'
    });
  });
});
