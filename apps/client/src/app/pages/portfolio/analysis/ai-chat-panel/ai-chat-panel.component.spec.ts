import { AiAgentChatResponse } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { OverlayContainer } from '@angular/cdk/overlay';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { GfAiChatPanelComponent } from './ai-chat-panel.component';

const STORAGE_KEY_MESSAGES = 'gf_ai_chat_messages';
const STORAGE_KEY_SESSION_ID = 'gf_ai_chat_session_id';

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

function createStoredMessage({
  content,
  id,
  role
}: {
  content: string;
  id: number;
  role: 'assistant' | 'user';
}) {
  return {
    content,
    createdAt: new Date().toISOString(),
    id,
    role
  };
}

describe('GfAiChatPanelComponent', () => {
  let component: GfAiChatPanelComponent;
  let fixture: ComponentFixture<GfAiChatPanelComponent>;
  let dataService: {
    postAiChat: jest.Mock;
    postAiChatFeedback: jest.Mock;
  };
  let overlayContainer: OverlayContainer;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();

    dataService = {
      postAiChat: jest.fn(),
      postAiChatFeedback: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GfAiChatPanelComponent, NoopAnimationsModule],
      providers: [{ provide: DataService, useValue: dataService }]
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);
    overlayContainerElement = overlayContainer.getContainerElement();

    fixture = TestBed.createComponent(GfAiChatPanelComponent);
    component = fixture.componentInstance;
    component.hasPermissionToReadAiPrompt = true;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    overlayContainer.ngOnDestroy();
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
    expect(localStorage.getItem(STORAGE_KEY_SESSION_ID)).toBe('session-1');
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) ?? '[]')
    ).toHaveLength(2);
  });

  it('shows diagnostics in info popover instead of inline message body', fakeAsync(() => {
    dataService.postAiChat.mockReturnValue(
      of(
        createChatResponse({
          answer: 'You are concentrated in one position.',
          sessionId: 'session-details',
          turns: 1
        })
      )
    );
    component.query = 'Help me diversify';

    component.onSubmit();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const chatLogText = nativeElement.querySelector('.chat-log')?.textContent ?? '';

    expect(nativeElement.querySelector('.chat-metadata')).toBeNull();
    expect(chatLogText).not.toContain('Confidence');
    expect(chatLogText).not.toContain('Citations');
    expect(chatLogText).not.toContain('Verification');

    const detailsTrigger = nativeElement.querySelector(
      '.chat-details-trigger'
    ) as HTMLButtonElement | null;

    expect(detailsTrigger).toBeTruthy();
    expect(detailsTrigger?.textContent).toContain('Info');

    detailsTrigger?.click();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const overlayText = overlayContainerElement.textContent ?? '';

    expect(overlayText).toContain('Confidence');
    expect(overlayText).toContain('Citations');
    expect(overlayText).toContain('Verification');
    expect(overlayText).toContain('2 holdings analyzed');
    expect(overlayText).toContain('market_data_coverage');
  }));

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

  it('restores chat session and messages from local storage', () => {
    localStorage.setItem(STORAGE_KEY_SESSION_ID, 'session-restored');
    localStorage.setItem(
      STORAGE_KEY_MESSAGES,
      JSON.stringify([
        createStoredMessage({
          content: 'Restored user message',
          id: 11,
          role: 'user'
        }),
        createStoredMessage({
          content: 'Restored assistant message',
          id: 12,
          role: 'assistant'
        })
      ])
    );

    const restoredFixture = TestBed.createComponent(GfAiChatPanelComponent);
    const restoredComponent = restoredFixture.componentInstance;
    restoredComponent.hasPermissionToReadAiPrompt = true;
    restoredFixture.detectChanges();

    dataService.postAiChat.mockReturnValue(
      of(
        createChatResponse({
          answer: 'Follow-up response',
          sessionId: 'session-restored',
          turns: 3
        })
      )
    );

    restoredComponent.query = 'Follow-up';
    restoredComponent.onSubmit();

    expect(restoredComponent.chatMessages).toHaveLength(4);
    expect(dataService.postAiChat).toHaveBeenCalledWith({
      query: 'Follow-up',
      sessionId: 'session-restored'
    });
  });

  it('ignores invalid chat storage payload without throwing', () => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, '{invalid-json');

    const restoredFixture = TestBed.createComponent(GfAiChatPanelComponent);
    const restoredComponent = restoredFixture.componentInstance;
    restoredComponent.hasPermissionToReadAiPrompt = true;

    expect(() => {
      restoredFixture.detectChanges();
    }).not.toThrow();
    expect(restoredComponent.chatMessages).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY_MESSAGES)).toBeNull();
  });

  it('caps restored chat history to the most recent 200 messages', () => {
    const storedMessages = Array.from({ length: 250 }, (_, index) => {
      return createStoredMessage({
        content: `message-${index}`,
        id: index,
        role: index % 2 === 0 ? 'user' : 'assistant'
      });
    });
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(storedMessages));

    const restoredFixture = TestBed.createComponent(GfAiChatPanelComponent);
    const restoredComponent = restoredFixture.componentInstance;
    restoredComponent.hasPermissionToReadAiPrompt = true;
    restoredFixture.detectChanges();

    expect(restoredComponent.chatMessages).toHaveLength(200);
    expect(restoredComponent.chatMessages[0].id).toBe(50);
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
