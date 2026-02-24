import { AiAgentChatResponse } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GfAiChatPanelComponent } from './ai-chat-panel.component';

function createChatResponse({
  answer,
  sessionId,
  turns
}: {
  answer: string;
  sessionId: string;
  turns: number;
}): AiAgentChatResponse {
  return {
    answer,
    citations: [
      {
        confidence: 0.9,
        snippet: '2 holdings analyzed',
        source: 'portfolio_analysis'
      }
    ],
    confidence: {
      band: 'high',
      score: 0.91
    },
    memory: {
      sessionId,
      turns
    },
    toolCalls: [
      {
        input: {},
        outputSummary: '2 holdings analyzed',
        status: 'success',
        tool: 'portfolio_analysis'
      }
    ],
    verification: [
      {
        check: 'market_data_coverage',
        details: '2/2 symbols resolved',
        status: 'passed'
      }
    ]
  };
}

describe('GfAiChatPanelComponent', () => {
  let component: GfAiChatPanelComponent;
  let fixture: ComponentFixture<GfAiChatPanelComponent>;
  let dataService: {
    postAiChat: jest.Mock;
    postAiChatFeedback: jest.Mock;
  };

  beforeEach(async () => {
    dataService = {
      postAiChat: jest.fn(),
      postAiChatFeedback: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GfAiChatPanelComponent],
      providers: [{ provide: DataService, useValue: dataService }]
    }).compileComponents();

    fixture = TestBed.createComponent(GfAiChatPanelComponent);
    component = fixture.componentInstance;
    component.hasPermissionToReadAiPrompt = true;
    fixture.detectChanges();
  });

  it('sends a chat query and appends assistant response', () => {
    dataService.postAiChat.mockReturnValue(
      of(
        createChatResponse({
          answer: 'Portfolio risk is medium due to concentration.',
          sessionId: 'session-1',
          turns: 1
        })
      )
    );
    component.query = 'Give me risk summary';

    component.onSubmit();

    expect(dataService.postAiChat).toHaveBeenCalledWith({
      query: 'Give me risk summary',
      sessionId: undefined
    });
    expect(component.chatMessages).toHaveLength(2);
    expect(component.chatMessages[0]).toEqual(
      expect.objectContaining({
        content: 'Give me risk summary',
        role: 'user'
      })
    );
    expect(component.chatMessages[1]).toEqual(
      expect.objectContaining({
        content: 'Portfolio risk is medium due to concentration.',
        role: 'assistant'
      })
    );
  });

  it('reuses session id across consecutive prompts', () => {
    dataService.postAiChat
      .mockReturnValueOnce(
        of(
          createChatResponse({
            answer: 'First answer',
            sessionId: 'session-abc',
            turns: 1
          })
        )
      )
      .mockReturnValueOnce(
        of(
          createChatResponse({
            answer: 'Second answer',
            sessionId: 'session-abc',
            turns: 2
          })
        )
      );

    component.query = 'First prompt';
    component.onSubmit();
    component.query = 'Second prompt';
    component.onSubmit();

    expect(dataService.postAiChat).toHaveBeenNthCalledWith(1, {
      query: 'First prompt',
      sessionId: undefined
    });
    expect(dataService.postAiChat).toHaveBeenNthCalledWith(2, {
      query: 'Second prompt',
      sessionId: 'session-abc'
    });
  });

  it('adds a fallback assistant message when chat request fails', () => {
    dataService.postAiChat.mockReturnValue(
      throwError(() => {
        return new Error('request failed');
      })
    );
    component.query = 'What is my allocation?';

    component.onSubmit();

    expect(component.errorMessage).toBeDefined();
    expect(component.chatMessages[1]).toEqual(
      expect.objectContaining({
        content: 'Request failed. Please retry.',
        role: 'assistant'
      })
    );
  });

  it('sends feedback for assistant responses', () => {
    dataService.postAiChat.mockReturnValue(
      of(
        createChatResponse({
          answer: 'Portfolio response',
          sessionId: 'session-feedback',
          turns: 1
        })
      )
    );
    dataService.postAiChatFeedback.mockReturnValue(
      of({
        accepted: true,
        feedbackId: 'feedback-1'
      })
    );
    component.query = 'Check my portfolio';

    component.onSubmit();
    component.onRateResponse({ index: 1, rating: 'up' });

    expect(dataService.postAiChatFeedback).toHaveBeenCalledWith({
      rating: 'up',
      sessionId: 'session-feedback'
    });
    expect(component.chatMessages[1].feedback).toEqual({
      feedbackId: 'feedback-1',
      isSubmitting: false,
      rating: 'up'
    });
  });
});
