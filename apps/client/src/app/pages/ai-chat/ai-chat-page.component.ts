import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  traceId?: string;
  feedback?: 1 | -1;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  selector: 'gf-ai-chat-page',
  standalone: true,
  styleUrls: ['./ai-chat-page.scss'],
  templateUrl: './ai-chat-page.html'
})
export class GfAiChatPageComponent implements OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer: ElementRef;

  public messages: ChatMessage[] = [];
  public userInput = '';
  public isLoading = false;

  private conversationHistory: any[] = [];
  private abortController: AbortController | null = null;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private ngZone: NgZone,
    private tokenStorageService: TokenStorageService
  ) {}

  public sendMessage() {
    const message = this.userInput.trim();
    if (!message || this.isLoading) {
      return;
    }

    this.messages.push({ role: 'user', content: message });
    this.userInput = '';
    this.isLoading = true;
    this.changeDetectorRef.markForCheck();
    this.scrollToBottom();

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    this.messages.push(assistantMsg);
    this.changeDetectorRef.markForCheck();

    this.streamResponse(message, assistantMsg);
  }

  public submitFeedback(msg: ChatMessage, value: 1 | -1) {
    if (!msg.traceId || msg.feedback) {
      return;
    }

    msg.feedback = value;
    this.changeDetectorRef.markForCheck();

    this.dataService
      .postAgentFeedback({ traceId: msg.traceId, value })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  public ngOnDestroy() {
    this.abortController?.abort();
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private async streamResponse(message: string, assistantMsg: ChatMessage) {
    this.abortController = new AbortController();
    const token = this.tokenStorageService.getToken();

    try {
      const res = await fetch('/api/v1/ai/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory
        }),
        signal: this.abortController.signal
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);

            this.ngZone.run(() => {
              if (eventType === 'text') {
                assistantMsg.content += JSON.parse(data);
                this.changeDetectorRef.markForCheck();
                this.scrollToBottom();
              } else if (eventType === 'done') {
                const metadata = JSON.parse(data);
                assistantMsg.traceId = metadata.traceId;
                assistantMsg.content = metadata.response;
                this.conversationHistory = metadata.conversationHistory;
                this.isLoading = false;
                this.changeDetectorRef.markForCheck();
                this.scrollToBottom();
              } else if (eventType === 'error') {
                const errorData = JSON.parse(data);
                assistantMsg.content =
                  errorData.error ||
                  'Sorry, something went wrong. Please try again.';
                this.isLoading = false;
                this.changeDetectorRef.markForCheck();
              }
            });

            eventType = '';
          }
        }
      }

      // If stream ended without a done event, finalize
      if (this.isLoading) {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }

      this.ngZone.run(() => {
        assistantMsg.content = 'Sorry, something went wrong. Please try again.';
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
        this.scrollToBottom();
      });
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
