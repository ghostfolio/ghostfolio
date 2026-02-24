import {
  AiChatConversation,
  AiChatConversationsService,
  AiChatMessage
} from '@ghostfolio/client/services/ai-chat-conversations.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { AiAgentChatResponse } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  selector: 'gf-chat-page',
  styleUrls: ['./chat-page.component.scss'],
  templateUrl: './chat-page.component.html'
})
export class GfChatPageComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('chatLogContainer', { static: false })
  chatLogContainer: ElementRef<HTMLElement>;
  public readonly assistantRoleLabel = $localize`Assistant`;
  public activeResponseDetails: AiAgentChatResponse | undefined;
  public conversations: AiChatConversation[] = [];
  public currentConversation: AiChatConversation | undefined;
  public errorMessage: string;
  public hasPermissionToReadAiPrompt = false;
  public isSubmitting = false;
  public query = '';
  public readonly starterPrompts = [
    $localize`Give me a portfolio risk summary.`,
    $localize`What are my top concentration risks right now?`,
    $localize`Show me the latest market prices for my top holdings.`
  ];
  public readonly userRoleLabel = $localize`You`;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private readonly aiChatConversationsService: AiChatConversationsService,
    private readonly dataService: DataService,
    private readonly userService: UserService
  ) {}

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        this.hasPermissionToReadAiPrompt = hasPermission(
          state?.user?.permissions,
          permissions.readAiPrompt
        );
      });

    this.aiChatConversationsService
      .getConversations()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((conversations) => {
        this.conversations = conversations;
      });

    this.aiChatConversationsService
      .getCurrentConversation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((conversation) => {
        this.currentConversation = conversation;
        this.activeResponseDetails = undefined;
        this.scrollToTop();
      });

    if (this.aiChatConversationsService.getConversationsSnapshot().length === 0) {
      this.aiChatConversationsService.createConversation();
    }
  }

  public ngAfterViewInit() {
    this.scrollToTop();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private scrollToTop() {
    if (this.chatLogContainer) {
      this.chatLogContainer.nativeElement.scrollTop = 0;
    }
  }

  public get visibleMessages() {
    const messages = this.currentConversation?.messages ?? [];
    return [...messages].reverse();
  }

  public getRoleLabel(role: AiChatMessage['role']) {
    return role === 'assistant' ? this.assistantRoleLabel : this.userRoleLabel;
  }

  public onDeleteConversation(event: Event, conversationId: string) {
    event.stopPropagation();

    this.aiChatConversationsService.deleteConversation(conversationId);

    if (this.aiChatConversationsService.getConversationsSnapshot().length === 0) {
      this.aiChatConversationsService.createConversation();
    }
  }

  public onNewChat() {
    this.errorMessage = undefined;
    this.query = '';
    this.aiChatConversationsService.createConversation();
  }

  public onOpenResponseDetails(response?: AiAgentChatResponse) {
    this.activeResponseDetails = response;
  }

  public onRateResponse({
    messageId,
    rating
  }: {
    messageId: number;
    rating: 'down' | 'up';
  }) {
    const conversation = this.currentConversation;

    if (!conversation) {
      return;
    }

    const message = conversation.messages.find(({ id }) => {
      return id === messageId;
    });

    if (!message?.response?.memory?.sessionId) {
      return;
    }

    if (message.feedback?.isSubmitting || message.feedback?.rating) {
      return;
    }

    this.aiChatConversationsService.updateMessage({
      conversationId: conversation.id,
      messageId,
      updater: (currentMessage) => {
        return {
          ...currentMessage,
          feedback: {
            ...currentMessage.feedback,
            isSubmitting: true
          }
        };
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
          this.aiChatConversationsService.updateMessage({
            conversationId: conversation.id,
            messageId,
            updater: (currentMessage) => {
              return {
                ...currentMessage,
                feedback: {
                  feedbackId,
                  isSubmitting: false,
                  rating
                }
              };
            }
          });
        },
        error: () => {
          this.aiChatConversationsService.updateMessage({
            conversationId: conversation.id,
            messageId,
            updater: (currentMessage) => {
              return {
                ...currentMessage,
                feedback: {
                  ...currentMessage.feedback,
                  isSubmitting: false
                }
              };
            }
          });
        }
      });
  }

  public onSelectConversation(conversationId: string) {
    this.errorMessage = undefined;
    this.query = '';
    this.aiChatConversationsService.selectConversation(conversationId);
  }

  public onSelectStarterPrompt(prompt: string) {
    this.query = prompt;
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

    const conversation =
      this.currentConversation ?? this.aiChatConversationsService.createConversation();

    this.aiChatConversationsService.appendUserMessage({
      content: normalizedQuery,
      conversationId: conversation.id
    });

    this.errorMessage = undefined;
    this.isSubmitting = true;
    this.query = '';

    this.dataService
      .postAiChat({
        query: normalizedQuery,
        sessionId: conversation.sessionId
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe({
        next: (response) => {
          this.aiChatConversationsService.setConversationSessionId({
            conversationId: conversation.id,
            sessionId: response.memory.sessionId
          });
          this.aiChatConversationsService.appendAssistantMessage({
            content: response.answer,
            conversationId: conversation.id,
            feedback: {
              isSubmitting: false
            },
            response
          });
        },
        error: () => {
          this.errorMessage = $localize`AI request failed. Check your model quota and permissions.`;

          this.aiChatConversationsService.appendAssistantMessage({
            content: $localize`Request failed. Please retry.`,
            conversationId: conversation.id
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

  public trackConversationById(
    _index: number,
    conversation: AiChatConversation
  ) {
    return conversation.id;
  }
}
