import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import {
  ConversationDetail,
  ConversationListItem,
  FeedbackPayload,
  SSEEvent
} from '../interfaces/interfaces';

const KEY_TOKEN = 'auth-token';
const SSE_TIMEOUT_MS = 90_000;

@Injectable()
export class AgentChatService implements OnDestroy {
  private abortController: AbortController | null = null;
  private destroy$ = new Subject<void>();

  public sendMessage(
    message: string,
    conversationId?: string
  ): Observable<SSEEvent> {
    return new Observable<SSEEvent>((subscriber) => {
      this.abortController?.abort();
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      let timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, SSE_TIMEOUT_MS);

      const body: Record<string, string> = { message };

      if (conversationId) {
        body['conversationId'] = conversationId;
      }

      const token =
        window.sessionStorage.getItem(KEY_TOKEN) ||
        window.localStorage.getItem(KEY_TOKEN);

      let receivedDoneEvent = false;

      fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal
      })
        .then(async (response) => {
          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorEvent: SSEEvent;

            try {
              const errorBody = await response.json();
              errorEvent = {
                type: 'error',
                code: errorBody.code || 'INTERNAL_ERROR',
                message: errorBody.message || response.statusText
              };
            } catch {
              errorEvent = {
                type: 'error',
                code:
                  response.status === 401
                    ? 'AUTH_REQUIRED'
                    : response.status === 429
                      ? 'RATE_LIMITED'
                      : 'INTERNAL_ERROR',
                message: response.statusText
              };
            }

            subscriber.next(errorEvent);
            subscriber.complete();

            return;
          }

          const reader = response.body?.getReader();

          if (!reader) {
            subscriber.next({
              type: 'error',
              code: 'INTERNAL_ERROR',
              message: 'No response stream'
            });
            subscriber.complete();

            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const markDone = () => {
            receivedDoneEvent = true;
          };

          try {
            while (true) {
              const { done, value } = await reader.read();

              clearTimeout(timeoutId);

              if (done) {
                this.flushSSEBuffer(buffer, subscriber, markDone);

                if (!receivedDoneEvent && !signal.aborted) {
                  subscriber.next({
                    type: 'error',
                    code: 'STREAM_INCOMPLETE',
                    message: 'Response may be incomplete.'
                  });
                }

                break;
              }

              // Reset idle timeout on each received chunk
              timeoutId = setTimeout(() => {
                this.abortController?.abort();
              }, SSE_TIMEOUT_MS);

              buffer += decoder.decode(value, { stream: true });
              buffer = this.parseSSEChunk(buffer, subscriber, markDone);
            }
          } catch (error: unknown) {
            if (signal.aborted) {
              // Intentional abort — do not emit error
            } else {
              subscriber.next({
                type: 'error',
                code: 'INTERNAL_ERROR',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Connection interrupted'
              });
            }
          }

          subscriber.complete();
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId);

          if (signal.aborted) {
            subscriber.complete();

            return;
          }

          subscriber.next({
            type: 'error',
            code: 'INTERNAL_ERROR',
            message:
              error instanceof Error ? error.message : 'Network error occurred'
          });
          subscriber.complete();
        });

      return () => {
        clearTimeout(timeoutId);
        this.abortController?.abort();
      };
    });
  }

  public getConversations(cursor?: string): Observable<{
    conversations: ConversationListItem[];
    nextCursor?: string;
  }> {
    return new Observable((subscriber) => {
      const token =
        window.sessionStorage.getItem(KEY_TOKEN) ||
        window.localStorage.getItem(KEY_TOKEN);

      let url = '/api/v1/agent/conversations?limit=20';

      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            subscriber.next(data);
          } else {
            subscriber.next({ conversations: [] });
          }

          subscriber.complete();
        })
        .catch(() => {
          subscriber.next({ conversations: [] });
          subscriber.complete();
        });
    });
  }

  public getConversation(id: string): Observable<ConversationDetail | null> {
    return new Observable((subscriber) => {
      const token =
        window.sessionStorage.getItem(KEY_TOKEN) ||
        window.localStorage.getItem(KEY_TOKEN);

      fetch(`/api/v1/agent/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            subscriber.next(data);
          } else {
            subscriber.next(null);
          }

          subscriber.complete();
        })
        .catch(() => {
          subscriber.next(null);
          subscriber.complete();
        });
    });
  }

  public deleteConversation(id: string): Observable<boolean> {
    return new Observable((subscriber) => {
      const token =
        window.sessionStorage.getItem(KEY_TOKEN) ||
        window.localStorage.getItem(KEY_TOKEN);

      fetch(`/api/v1/agent/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (response) => {
          subscriber.next(response.ok);
          subscriber.complete();
        })
        .catch(() => {
          subscriber.next(false);
          subscriber.complete();
        });
    });
  }

  public submitFeedback(
    payload: FeedbackPayload
  ): Observable<{ success: boolean }> {
    return new Observable<{ success: boolean }>((subscriber) => {
      const token =
        window.sessionStorage.getItem(KEY_TOKEN) ||
        window.localStorage.getItem(KEY_TOKEN);

      fetch('/api/v1/agent/feedback', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          if (response.ok) {
            subscriber.next({ success: true });
          } else {
            subscriber.next({ success: false });
          }

          subscriber.complete();
        })
        .catch(() => {
          subscriber.next({ success: false });
          subscriber.complete();
        });
    });
  }

  public abort() {
    this.abortController?.abort();
  }

  public ngOnDestroy() {
    this.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseSSEChunk(
    buffer: string,
    subscriber: { next: (event: SSEEvent) => void },
    onDone?: () => void
  ): string {
    const lines = buffer.split('\n');
    let remaining = '';

    // The last element may be an incomplete line
    if (!buffer.endsWith('\n')) {
      remaining = lines.pop() || '';
    }

    let currentData = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('data:')) {
        currentData = trimmed.slice(5).trim();
      } else if (trimmed === '' && currentData) {
        // Empty line = end of event
        this.emitParsedEvent(currentData, subscriber, onDone);
        currentData = '';
      }
    }

    // If there's pending data without a trailing blank line, keep it in buffer
    if (currentData) {
      remaining = `data: ${currentData}\n${remaining}`;
    }

    return remaining;
  }

  private flushSSEBuffer(
    buffer: string,
    subscriber: { next: (event: SSEEvent) => void },
    onDone?: () => void
  ) {
    if (!buffer.trim()) {
      return;
    }

    const lines = buffer.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        this.emitParsedEvent(data, subscriber, onDone);
      }
    }
  }

  private emitParsedEvent(
    data: string,
    subscriber: { next: (event: SSEEvent) => void },
    onDone?: () => void
  ) {
    try {
      const parsed = JSON.parse(data) as SSEEvent;

      if (parsed.type === 'done' && onDone) {
        onDone();
      }

      subscriber.next(parsed);
    } catch {
      // Ignore unparseable chunks
    }
  }
}
