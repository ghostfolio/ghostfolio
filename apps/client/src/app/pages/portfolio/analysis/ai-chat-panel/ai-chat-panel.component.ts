import { AiAgentChatResponse } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

interface AiChatFeedbackState {
  feedbackId?: string;
  isSubmitting: boolean;
  rating?: 'down' | 'up';
}

interface AiChatMessage {
  content: string;
  createdAt: Date;
  feedback?: AiChatFeedbackState;
  id: number;
  response?: AiAgentChatResponse;
  role: 'assistant' | 'user';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  selector: 'gf-ai-chat-panel',
  styleUrls: ['./ai-chat-panel.component.scss'],
  templateUrl: './ai-chat-panel.component.html'
})
export class GfAiChatPanelComponent implements OnDestroy {
  @Input() hasPermissionToReadAiPrompt = false;

  public readonly assistantRoleLabel = $localize`Assistant`;
  public chatMessages: AiChatMessage[] = [];
  public errorMessage: string;
  public isSubmitting = false;
  public query = '';
  public readonly starterPrompts = [
    $localize`Give me a portfolio risk summary.`,
    $localize`What are my top concentration risks right now?`,
    $localize`Show me the latest market prices for my top holdings.`
  ];
  public readonly userRoleLabel = $localize`You`;

  private chatSessionId: string;
  private nextMessageId = 0;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dataService: DataService
  ) {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onSelectStarterPrompt(prompt: string) {
    this.query = prompt;
  }

  public onRateResponse({
    index,
    rating
  }: {
    index: number;
    rating: 'down' | 'up';
  }) {
    const message = this.chatMessages[index];

    if (!message?.response?.memory?.sessionId) {
      return;
    }

    if (message.feedback?.isSubmitting || message.feedback?.rating) {
      return;
    }

    this.updateMessage(index, {
      ...message,
      feedback: {
        ...message.feedback,
        isSubmitting: true
      }
    });

    this.dataService
      .postAiChatFeedback({
        rating,
        sessionId: message.response.memory.sessionId
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({ feedbackId }) => {
          this.updateMessage(index, {
            ...message,
            feedback: {
              feedbackId,
              isSubmitting: false,
              rating
            }
          });
        },
        error: () => {
          this.updateMessage(index, {
            ...message,
            feedback: {
              ...message.feedback,
              isSubmitting: false
            }
          });
        }
      });
  }

  public onSubmitFromKeyboard(event: KeyboardEvent) {
    if (!event.shiftKey) {
      this.onSubmit();
      event.preventDefault();
    }
  }

  public onSubmit() {
    const normalizedQuery = this.query?.trim();

    if (
      !this.hasPermissionToReadAiPrompt ||
      this.isSubmitting ||
      !normalizedQuery
    ) {
      return;
    }

    this.chatMessages = [
      ...this.chatMessages,
      {
        content: normalizedQuery,
        createdAt: new Date(),
        id: this.nextMessageId++,
        role: 'user'
      }
    ];
    this.errorMessage = undefined;
    this.isSubmitting = true;
    this.query = '';

    this.dataService
      .postAiChat({
        query: normalizedQuery,
        sessionId: this.chatSessionId
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe({
        next: (response) => {
          this.chatSessionId = response.memory.sessionId;
          this.chatMessages = [
            ...this.chatMessages,
            {
              content: response.answer,
              createdAt: new Date(),
              feedback: {
                isSubmitting: false
              },
              id: this.nextMessageId++,
              response,
              role: 'assistant'
            }
          ];

          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.errorMessage = $localize`AI request failed. Check your model quota and permissions.`;
          this.chatMessages = [
            ...this.chatMessages,
            {
              content: $localize`Request failed. Please retry.`,
              createdAt: new Date(),
              id: this.nextMessageId++,
              role: 'assistant'
            }
          ];

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public getRoleLabel(role: AiChatMessage['role']) {
    return role === 'assistant' ? this.assistantRoleLabel : this.userRoleLabel;
  }

  private updateMessage(index: number, updatedMessage: AiChatMessage) {
    this.chatMessages = this.chatMessages.map((message, messageIndex) => {
      return messageIndex === index ? updatedMessage : message;
    });
    this.changeDetectorRef.markForCheck();
  }
}
