import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { Filter } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { DataService } from '@ghostfolio/ui/services';

import { HttpParams } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import '@angular/localize/init';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { UIMessage } from 'ai';

import {
  buildAiChatRequestMessages,
  getAiChatSourceLabels,
  GfAiChatComponent
} from './ai-chat.component';

let mockPrepareSendMessagesRequest: (options: {
  headers: Record<string, string>;
  messages: UIMessage[];
}) => { api: string };

jest.mock('@ai-sdk/angular', () => {
  const { signal } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  class ChatMock {
    public error: Error | undefined;
    public sendMessageCallCount = 0;
    public status = 'ready';
    public stopCallCount = 0;
    private readonly messagesSignal = signal<UIMessage[]>([]);

    public get messages() {
      return this.messagesSignal();
    }

    public set messages(messages: UIMessage[]) {
      this.messagesSignal.set(messages);
    }

    public clearError() {
      this.error = undefined;
      this.status = 'ready';
    }

    public regenerate() {
      return Promise.resolve();
    }

    public sendMessage() {
      this.sendMessageCallCount += 1;

      return Promise.resolve();
    }

    public stop() {
      this.stopCallCount += 1;

      return Promise.resolve();
    }
  }

  return { Chat: ChatMock };
});

jest.mock('@ionic/angular/standalone', () => {
  const { Component } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  class IonIconMock {}

  Component({
    inputs: ['name'],
    selector: 'ion-icon',
    standalone: true,
    template: ''
  })(IonIconMock);

  return { IonIcon: IonIconMock };
});

jest.mock('ai', () => {
  class DefaultChatTransportMock {
    public constructor({
      prepareSendMessagesRequest
    }: {
      prepareSendMessagesRequest: typeof mockPrepareSendMessagesRequest;
    }) {
      mockPrepareSendMessagesRequest = prepareSendMessagesRequest;
    }
  }

  return {
    DefaultChatTransport: DefaultChatTransportMock,
    isTextUIPart: (part: { type: string }) => part.type === 'text'
  };
});

jest.mock('ionicons', () => {
  return { addIcons: () => undefined };
});

jest.mock('ionicons/icons', () => {
  return {
    closeOutline: '',
    refreshOutline: '',
    sendOutline: '',
    stopCircleOutline: '',
    trashOutline: ''
  };
});

describe('GfAiChatComponent', () => {
  const consentKey = 'ghostfolio.ai-chat.consent:openai/test-model';
  let component: GfAiChatComponent;
  let fixture: ComponentFixture<GfAiChatComponent>;

  const acceptConsent = () => {
    const consentButton = getButton('Consent and continue');

    expect(consentButton).toBeDefined();
    consentButton?.click();
    fixture.detectChanges();
  };

  const createComponent = ({
    filters = [],
    range = 'ytd'
  }: {
    filters?: Filter[];
    range?: DateRange;
  } = {}) => {
    fixture = TestBed.createComponent(GfAiChatComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filters', filters);
    fixture.componentRef.setInput('model', 'openai/test-model');
    fixture.componentRef.setInput('range', range);
    fixture.detectChanges();
    TestBed.flushEffects();
  };

  const getButton = (label: string) => {
    return [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => {
        return button.textContent?.includes(label);
      }
    ) as HTMLButtonElement | undefined;
  };

  const getComponentInternals = () => {
    return component as unknown as {
      chat: {
        messages: UIMessage[];
        sendMessageCallCount: number;
        status: string;
        stopCallCount: number;
      };
      getApiUrl: () => string;
      hasConsent: () => boolean;
      prompt: {
        (): string;
        set: (value: string) => void;
      };
      sendMessage: () => void;
      scopeSignature: () => string;
    };
  };

  beforeEach(async () => {
    window.sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [GfAiChatComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: DataService,
          useValue: {
            buildFiltersAsQueryParams: ({
              filters
            }: {
              filters?: Filter[];
            }) => {
              let queryParams = new HttpParams();

              for (const filter of filters ?? []) {
                if (filter.type === 'ACCOUNT') {
                  queryParams = queryParams.append('accounts', filter.id);
                } else if (filter.type === 'TAG') {
                  queryParams = queryParams.append('tags', filter.id);
                }
              }

              return queryParams;
            }
          }
        },
        {
          provide: TokenStorageService,
          useValue: { getToken: () => 'test-token' }
        }
      ]
    }).compileComponents();

    createComponent();
  });

  it('binds the model-specific session consent marker to the scope', () => {
    expect(fixture.nativeElement.textContent).toContain('Before you start');
    expect(fixture.nativeElement.textContent).toContain('OpenRouter');
    expect(fixture.nativeElement.textContent).toContain(
      'Your consent applies to the portfolio scope shown above'
    );
    expect(fixture.nativeElement.textContent).toContain(
      'you are asked to consent again'
    );
    expect(fixture.nativeElement.textContent).toContain(
      'may process or retain submitted data'
    );

    acceptConsent();

    expect(window.sessionStorage.getItem(consentKey)).toBe(
      getComponentInternals().scopeSignature()
    );
    expect(window.sessionStorage.length).toBe(1);
  });

  it('does not render remote images or raw HTML as active content', () => {
    acceptConsent();

    getComponentInternals().chat.messages = [
      {
        id: 'assistant-message',
        parts: [
          {
            text: [
              '![Remote chart](https://tracker.example/chart.png)',
              '<em id="raw-html">raw html</em>',
              '*Safe emphasis* and [Safe link](https://example.com)'
            ].join('\n\n'),
            type: 'text'
          }
        ],
        role: 'assistant'
      }
    ];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('#raw-html')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      '<em id="raw-html">raw html</em>'
    );
    expect(
      fixture.nativeElement.querySelector('a[href="https://example.com/"]')
    ).not.toBeNull();
  });

  it('uses the active range and filters in the API request URL', () => {
    fixture.componentRef.setInput('filters', [
      { id: 'account-1', type: 'ACCOUNT' },
      { id: 'tag-1', type: 'TAG' }
    ]);
    fixture.detectChanges();

    expect(getComponentInternals().getApiUrl()).toBe(
      '/api/v1/ai/chat?accounts=account-1&tags=tag-1&range=ytd'
    );
  });

  it.each([
    {
      changeScope: () => fixture.componentRef.setInput('range', '1y'),
      scopePart: 'date range'
    },
    {
      changeScope: () =>
        fixture.componentRef.setInput('filters', [
          { id: 'account-1', type: 'ACCOUNT' }
        ]),
      scopePart: 'filters'
    }
  ])(
    'invalidates consent and context when the $scopePart changes',
    ({ changeScope }) => {
      acceptConsent();

      const componentInternals = getComponentInternals();

      componentInternals.chat.messages = [
        {
          id: 'message-1',
          parts: [{ text: 'How am I doing?', type: 'text' }],
          role: 'user'
        }
      ];
      componentInternals.chat.status = 'streaming';
      componentInternals.prompt.set('Compare my holdings');
      const stopCallCount = componentInternals.chat.stopCallCount;

      changeScope();
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(componentInternals.chat.stopCallCount).toBe(stopCallCount + 1);
      expect(componentInternals.chat.messages).toEqual([]);
      expect(componentInternals.prompt()).toBe('');
      expect(window.sessionStorage.getItem(consentKey)).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Before you start');
    }
  );

  it('blocks sending as soon as the scope input changes', () => {
    acceptConsent();

    const componentInternals = getComponentInternals();

    componentInternals.prompt.set('Compare my holdings');

    fixture.componentRef.setInput('range', '1y');

    expect(componentInternals.hasConsent()).toBe(false);

    componentInternals.sendMessage();

    expect(componentInternals.chat.sendMessageCallCount).toBe(0);
  });

  it('preserves consent and context for equivalent filter changes', () => {
    fixture.componentRef.setInput('filters', [
      { id: 'account-1', label: 'Brokerage', type: 'ACCOUNT' },
      { id: 'tag-1', label: 'Long term', type: 'TAG' }
    ]);
    fixture.detectChanges();
    TestBed.flushEffects();
    acceptConsent();

    const componentInternals = getComponentInternals();

    componentInternals.chat.messages = [
      {
        id: 'message-1',
        parts: [{ text: 'How am I doing?', type: 'text' }],
        role: 'user'
      }
    ];
    const consentScopeSignature = window.sessionStorage.getItem(consentKey);
    const stopCallCount = componentInternals.chat.stopCallCount;

    fixture.componentRef.setInput('filters', [
      { id: 'tag-1', label: 'Retirement', type: 'TAG' },
      { id: 'account-1', label: 'Primary account', type: 'ACCOUNT' }
    ]);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(componentInternals.chat.stopCallCount).toBe(stopCallCount);
    expect(componentInternals.chat.messages).toHaveLength(1);
    expect(window.sessionStorage.getItem(consentKey)).toBe(
      consentScopeSignature
    );
    expect(fixture.nativeElement.textContent).not.toContain('Before you start');
  });

  it('restores consent only when a reopened panel has the same scope', () => {
    acceptConsent();

    const consentScopeSignature = window.sessionStorage.getItem(consentKey);

    fixture.destroy();
    createComponent();

    expect(window.sessionStorage.getItem(consentKey)).toBe(
      consentScopeSignature
    );
    expect(fixture.nativeElement.textContent).not.toContain('Before you start');

    fixture.destroy();
    createComponent({ range: '1y' });

    expect(window.sessionStorage.getItem(consentKey)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Before you start');
  });

  it('removes a legacy model-only consent marker', () => {
    fixture.destroy();
    window.sessionStorage.setItem(consentKey, 'true');

    createComponent();

    expect(window.sessionStorage.getItem(consentKey)).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Before you start');
  });

  it('stores renewed consent for the changed request scope', () => {
    fixture.componentRef.setInput('filters', [
      { id: 'account-1', type: 'ACCOUNT' }
    ]);
    fixture.detectChanges();
    TestBed.flushEffects();
    acceptConsent();

    fixture.componentRef.setInput('range', '1y');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    acceptConsent();

    expect(window.sessionStorage.getItem(consentKey)).toBe(
      getComponentInternals().scopeSignature()
    );
    expect(
      mockPrepareSendMessagesRequest({ headers: {}, messages: [] }).api
    ).toBe('/api/v1/ai/chat?accounts=account-1&range=1y');
  });

  it('stops the active stream and clears messages when destroyed', () => {
    const componentInternals = component as unknown as {
      chat: { messages: UIMessage[]; stopCallCount: number };
    };

    componentInternals.chat.messages = [
      {
        id: 'message-1',
        parts: [{ text: 'Streaming response', type: 'text' }],
        role: 'assistant'
      }
    ];
    const stopCallCount = componentInternals.chat.stopCallCount;

    fixture.destroy();

    expect(componentInternals.chat.stopCallCount).toBe(stopCallCount + 1);
    expect(componentInternals.chat.messages).toEqual([]);
  });
});

describe('AI chat request messages', () => {
  it('sends only text messages and keeps the most recent twelve', () => {
    const messages: UIMessage[] = Array.from({ length: 13 }, (_, index) => ({
      id: `message-${index}`,
      parts: [
        { text: `Question ${index}`, type: 'text' },
        { text: 'private reasoning', type: 'reasoning' }
      ],
      role: 'user'
    }));

    const requestMessages = buildAiChatRequestMessages(messages);

    expect(requestMessages).toHaveLength(12);
    expect(requestMessages[0]).toEqual({
      content: 'Question 1',
      role: 'user'
    });
    expect(requestMessages.at(-1)).toEqual({
      content: 'Question 12',
      role: 'user'
    });
    expect(JSON.stringify(requestMessages)).not.toContain('private reasoning');
  });
});

describe('AI chat source labels', () => {
  it('labels only tools that returned portfolio data', () => {
    const message = {
      id: 'assistant-message',
      parts: [
        {
          input: {},
          state: 'output-available',
          toolCallId: 'summary-call',
          type: 'tool-getPortfolioSummary',
          output: { privatePayload: true }
        },
        {
          input: {},
          state: 'input-available',
          toolCallId: 'holdings-call',
          type: 'tool-getPortfolioHoldings'
        },
        {
          input: {},
          state: 'output-available',
          toolCallId: 'performance-call',
          type: 'tool-getPortfolioPerformance',
          output: { privatePayload: true }
        }
      ],
      role: 'assistant'
    } as unknown as UIMessage;

    expect(getAiChatSourceLabels(message)).toEqual([
      'Portfolio summary',
      'Performance'
    ]);
  });
});
