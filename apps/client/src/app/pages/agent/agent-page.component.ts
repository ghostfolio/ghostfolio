import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { NotificationService } from '@ghostfolio/ui/notifications';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatResponse {
  message: { role: string; content: string };
  verification?: { passed: boolean; type: string; message?: string };
  error?: string;
}

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    RouterModule
  ],
  selector: 'gf-agent-page',
  styleUrls: ['./agent-page.scss'],
  templateUrl: './agent-page.html'
})
export class GfAgentPageComponent implements OnDestroy, OnInit {
  @ViewChild('messagesContainer') messagesContainer: ElementRef<HTMLElement>;
  @ViewChild('inputEl') inputEl: ElementRef<HTMLTextAreaElement>;

  public inputText = '';
  public isLoading = false;
  public messages: ChatMessage[] = [];
  public routerLinkPortfolio = internalRoutes.portfolio.routerLink;
  public suggestions = [
    $localize`What is my portfolio allocation?`,
    $localize`How did my portfolio perform this year?`,
    $localize`List my recent transactions.`,
    $localize`What is the current price of AAPL?`
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  public ngOnInit() {
    // No auth needed here - AuthGuard ensures user is logged in; interceptor adds JWT
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onInputKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return; // allow newline with Shift+Enter
    event.preventDefault();
    this.send();
  }

  public onSuggestionClick(text: string) {
    this.inputText = text;
    this.send();
  }

  public send() {
    const text = (this.inputText ?? '').trim();
    if (!text || this.isLoading) return;

    this.inputText = '';
    this.messages.push({ role: 'user', content: text });
    this.isLoading = true;
    this.scrollToBottom();
    this.changeDetectorRef.markForCheck();

    const body = {
      messages: this.messages.map((m) => ({ role: m.role, content: m.content }))
    };

    this.http
      .post<AgentChatResponse>('/api/v1/agent/chat', body)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: (res) => {
          this.messages.push({
            role: 'assistant',
            content: res.message?.content ?? $localize`No response.`
          });
          this.isLoading = false;
          this.scrollToBottom();
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          const msg =
            err?.error?.error ??
            err?.message ??
            $localize`Request failed. Check your connection and try again.`;
          this.messages.push({
            role: 'assistant',
            content: $localize`Error: ${msg}`
          });
          this.isLoading = false;
          this.scrollToBottom();
          this.changeDetectorRef.markForCheck();
          this.notificationService.alert({ title: $localize`Agent Error`, message: msg });
        }
      });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
