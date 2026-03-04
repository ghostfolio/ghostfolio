import { A11yModule } from '@angular/cdk/a11y';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { IonIcon } from '@ionic/angular/standalone';
import { isThisMonth, isThisWeek, isToday, isYesterday } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  arrowDownOutline,
  chatbubbleEllipsesOutline,
  closeOutline,
  listOutline,
  refreshOutline,
  sendOutline,
  stopCircleOutline,
  trashOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

import { GfAgentChatMessageComponent } from './agent-chat-message/agent-chat-message.component';
import {
  ChatMessage,
  ConversationGroup,
  ConversationListItem,
  ERROR_MESSAGES,
  SSEEvent,
  SUGGESTED_PROMPTS,
  TOOL_DISPLAY_NAMES,
  ToolUsed
} from './interfaces/interfaces';
import { AgentChatService } from './services/agent-chat.service';
import { IncrementalMarkdownRenderer } from './services/incremental-markdown';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES = 100;
const MAX_RETRIES = 3;
const STORAGE_KEY_CONVERSATION = 'agent-conversation-id';

// Typing animation constants
const MIN_CHARS_PER_SEC = 60;
const MAX_CHARS_PER_SEC = 800;
const TARGET_LAG_CHARS = 40;
const SPEED_SMOOTHING = 0.15;
const MAX_DELTA_MS = 100;
const MAX_WORD_SNAP = 20;

export interface AgentChatDialogData {
  deviceType: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    A11yModule,
    FormsModule,
    GfAgentChatMessageComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    NgxSkeletonLoaderModule,
    TextFieldModule
  ],
  providers: [AgentChatService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-agent-chat',
  styleUrls: ['./agent-chat.scss'],
  templateUrl: './agent-chat.html'
})
export class GfAgentChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageList') messageListEl: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInputEl: ElementRef<HTMLTextAreaElement>;
  @ViewChild(CdkTextareaAutosize) autosize: CdkTextareaAutosize;

  public activeConversationId: string | null = null;
  public conversations: ConversationListItem[] = [];
  public currentStreamingMessageId: string | null = null;
  public currentToolName: string | null = null;
  public inputText = '';
  public isLoading = false;
  public isLoadingConversations = false;
  public isLoadingHistory = false;
  public isLoadingMoreConversations = false;
  public maxMessages = MAX_MESSAGES;
  public messages: ChatMessage[] = [];
  public maxLength = MAX_MESSAGE_LENGTH;
  public nextConversationCursor: string | null = null;
  public sessionId: string | null = null;
  public showConversationList = false;
  public showScrollFab = false;
  public skipMessageAnimations = false;
  public suggestedPrompts = SUGGESTED_PROMPTS;
  private cachedConversationsRef: ConversationListItem[] | null = null;
  private cachedGroupedConversations: ConversationGroup[] = [];
  private animationFrameId: number | null = null;
  private currentSpeed = MIN_CHARS_PER_SEC;
  private isProgrammaticScroll = false;
  private lastFrameTime = 0;
  private markdownRenderer: IncrementalMarkdownRenderer;
  private pendingPostProcessing: Array<(msg: ChatMessage) => void> = [];
  private retryCounters = new Map<string, number>();
  private stickedToBottom = true;
  private pendingStreamFinalization = false;
  private renderDirty = false;
  private renderThrottle$ = new Subject<void>();
  private streamSubscription: Subscription | null = null;
  private subPixelAccumulator = 0;
  private targetContent = '';
  private typingAgentMessage: ChatMessage | null = null;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private agentChatService: AgentChatService,
    private changeDetectorRef: ChangeDetectorRef,
    public dialogRef: MatDialogRef<GfAgentChatComponent>,
    private ngZone: NgZone,
    @Inject(MAT_DIALOG_DATA) public data: AgentChatDialogData
  ) {
    addIcons({
      arrowDownOutline,
      chatbubbleEllipsesOutline,
      closeOutline,
      listOutline,
      refreshOutline,
      sendOutline,
      stopCircleOutline,
      trashOutline
    });

    this.markdownRenderer = new IncrementalMarkdownRenderer();
  }

  public ngOnInit() {
    this.emitAnalyticsEvent('chat_panel_opened');
    this.loadConversations();

    // Auto-restore last active conversation from session storage
    const savedConversationId = sessionStorage.getItem(
      STORAGE_KEY_CONVERSATION
    );

    if (savedConversationId) {
      this.skipMessageAnimations = true;
      this.onLoadConversation(savedConversationId);
    }

    this.renderThrottle$
      .pipe(
        throttleTime(100, undefined, { leading: true, trailing: true }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(() => {
        this.ngZone.run(() => {
          if (this.renderDirty && this.typingAgentMessage) {
            const msg = this.typingAgentMessage;
            msg.streamingHtml = this.markdownRenderer.render(msg.content, true);
            this.renderDirty = false;
          }

          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        });
      });

    this.dialogRef
      .backdropClick()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.onClose();
      });

    this.dialogRef
      .keydownEvents()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.onClose();
        }
      });
  }

  public get isMobile(): boolean {
    return this.data?.deviceType === 'mobile';
  }

  public get characterCountClass(): string {
    const length = this.inputText?.length || 0;

    if (length > 3800) {
      return 'char-count-danger';
    } else if (length > 3000) {
      return 'char-count-warning';
    }

    return '';
  }

  public get groupedConversations(): ConversationGroup[] {
    if (this.conversations === this.cachedConversationsRef) {
      return this.cachedGroupedConversations;
    }

    this.cachedConversationsRef = this.conversations;

    const groups: Record<string, ConversationListItem[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      'This month': [],
      Older: []
    };

    for (const conversation of this.conversations) {
      const date = new Date(conversation.updatedAt);

      if (isToday(date)) {
        groups['Today'].push(conversation);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(conversation);
      } else if (isThisWeek(date)) {
        groups['This week'].push(conversation);
      } else if (isThisMonth(date)) {
        groups['This month'].push(conversation);
      } else {
        groups['Older'].push(conversation);
      }
    }

    this.cachedGroupedConversations = Object.entries(groups)
      .filter(([, conversations]) => conversations.length > 0)
      .map(([label, conversations]) => ({ label, conversations }));

    return this.cachedGroupedConversations;
  }

  public get canSend(): boolean {
    return this.inputText?.trim().length > 0 && !this.isLoading;
  }

  public onSendMessage(text?: string) {
    const messageText = (text || this.inputText)?.trim();

    if (!messageText || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.inputText = '';
    this.resetTextareaHeight();
    this.isLoading = true;
    this.emitAnalyticsEvent('message_sent');

    // Trim to max messages
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }

    const agentMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolsUsed: []
    };

    this.messages.push(agentMessage);
    this.currentStreamingMessageId = agentMessage.id;
    this.changeDetectorRef.detectChanges();
    this.scrollToBottom(true);

    this.streamSubscription = this.agentChatService
      .sendMessage(messageText, this.activeConversationId)
      .subscribe({
        next: (event) => {
          this.handleSSEEvent(event, agentMessage);
        },
        complete: () => {
          this.pendingStreamFinalization = true;

          // If no typing animation running, finalize immediately
          if (!this.animationFrameId) {
            if (this.targetContent) {
              agentMessage.content = this.targetContent;
            }
            agentMessage.isStreaming = false;
            agentMessage.streamingHtml = undefined;
            this.isLoading = false;
            this.currentStreamingMessageId = null;
            this.dialogRef.disableClose = false;
            this.changeDetectorRef.detectChanges();
            this.scrollToBottom();
          }
        }
      });

    this.dialogRef.disableClose = true;
  }

  public onSuggestedPrompt(prompt: string) {
    this.onSendMessage(prompt);
  }

  public onNewConversation() {
    this.doNewConversation();
  }

  public onClose() {
    if (this.isLoading) {
      return;
    }

    this.emitAnalyticsEvent('chat_panel_closed');
    this.dialogRef.close();
  }

  public onFeedbackChanged(
    message: ChatMessage,
    event: { rating: 'positive' | 'negative' | null }
  ) {
    if (!message.interactionId) {
      return;
    }

    if (event.rating === null) {
      // Toggle off — send opposite to retract within 5-min window
      message.feedbackRating = null;
      this.changeDetectorRef.markForCheck();

      return;
    }

    message.feedbackRating = event.rating;
    this.emitAnalyticsEvent('feedback_submitted', { rating: event.rating });
    this.changeDetectorRef.markForCheck();

    this.agentChatService
      .submitFeedback({
        interactionId: message.interactionId,
        rating: event.rating
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onScroll() {
    if (this.isProgrammaticScroll) {
      return;
    }

    const el = this.messageListEl?.nativeElement;

    if (!el) {
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.stickedToBottom = distanceFromBottom <= 50;
    this.showScrollFab = !this.stickedToBottom;
    this.changeDetectorRef.markForCheck();
  }

  public scrollToBottom(force = false) {
    if (!force && !this.stickedToBottom) {
      return;
    }

    if (force) {
      this.stickedToBottom = true;
      this.showScrollFab = false;
    }

    const el = this.messageListEl?.nativeElement;

    if (el) {
      this.isProgrammaticScroll = true;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setTimeout(() => {
        this.isProgrammaticScroll = false;
      }, 300);
    }
  }

  public onStopGenerating() {
    this.agentChatService.abort();
    this.streamSubscription?.unsubscribe();

    const streamingMsg = this.messages.find(
      (m) => m.id === this.currentStreamingMessageId
    );

    if (streamingMsg) {
      this.endReasoningPhase(streamingMsg);

      if (this.targetContent) {
        streamingMsg.content = this.targetContent;
      }

      streamingMsg.isStreaming = false;
      streamingMsg.isVerifying = false;
      streamingMsg.streamingHtml = undefined;
    }

    this.stopTypingAnimation();
    this.isLoading = false;
    this.currentStreamingMessageId = null;
    this.currentToolName = null;
    this.dialogRef.disableClose = false;
    this.changeDetectorRef.detectChanges();
  }

  public onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  public onRetryLastMessage() {
    // Find the last error agent message
    let errorIndex = -1;

    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'agent' && this.messages[i].isError) {
        errorIndex = i;
        break;
      }
    }

    if (errorIndex < 0) {
      return;
    }

    // Find the user message immediately before the error
    let userIndex = -1;

    for (let i = errorIndex - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        userIndex = i;
        break;
      }
    }

    if (userIndex < 0) {
      return;
    }

    const messageToRetry = this.messages[userIndex].content;
    const retryKey = this.messages[userIndex].id;
    const retryCount = this.retryCounters.get(retryKey) ?? 0;

    if (retryCount >= MAX_RETRIES) {
      return;
    }

    this.retryCounters.set(retryKey, retryCount + 1);

    // Remove error message first (higher index), then user message
    this.messages.splice(errorIndex, 1);
    this.messages.splice(userIndex, 1);

    // Exponential backoff: 1s, 2s, 4s
    const delayMs = Math.pow(2, retryCount) * 1000;

    setTimeout(() => {
      this.onSendMessage(messageToRetry);
    }, delayMs);
  }

  public onToggleConversationList() {
    this.showConversationList = !this.showConversationList;

    if (this.showConversationList) {
      this.loadConversations();
    }

    this.changeDetectorRef.markForCheck();
  }

  public onLoadMoreConversations() {
    if (!this.nextConversationCursor || this.isLoadingMoreConversations) {
      return;
    }

    this.isLoadingMoreConversations = true;
    this.changeDetectorRef.markForCheck();

    this.agentChatService
      .getConversations(this.nextConversationCursor)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((result) => {
        this.conversations = [...this.conversations, ...result.conversations];
        this.nextConversationCursor = result.nextCursor || null;
        this.isLoadingMoreConversations = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  public onLoadConversation(conversationId: string) {
    if (this.isLoading || this.isLoadingHistory) {
      return;
    }

    this.isLoadingHistory = true;
    this.showConversationList = false;
    this.changeDetectorRef.markForCheck();

    this.agentChatService
      .getConversation(conversationId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((conversation) => {
        this.isLoadingHistory = false;

        if (!conversation) {
          this.changeDetectorRef.markForCheck();
          return;
        }

        this.stopTypingAnimation();
        this.agentChatService.abort();
        this.streamSubscription?.unsubscribe();

        this.skipMessageAnimations = true;
        this.activeConversationId = conversation.id;
        sessionStorage.setItem(STORAGE_KEY_CONVERSATION, conversation.id);
        this.messages = conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'agent',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          toolsUsed: msg.toolsUsed as ToolUsed[] | undefined,
          confidence: msg.confidence as
            | { level: 'high' | 'medium' | 'low'; score: number }
            | undefined,
          disclaimers: msg.disclaimers
        }));
        this.sessionId = null;
        this.currentStreamingMessageId = null;
        this.currentToolName = null;
        this.isLoading = false;
        this.showConversationList = false;
        this.dialogRef.disableClose = false;

        this.emitAnalyticsEvent('conversation_loaded');
        this.changeDetectorRef.detectChanges();
        this.scrollToBottom(true);

        setTimeout(() => {
          this.skipMessageAnimations = false;
          this.changeDetectorRef.markForCheck();
        });
      });
  }

  public onDeleteConversation(event: MouseEvent, conversationId: string) {
    event.stopPropagation();

    this.agentChatService
      .deleteConversation(conversationId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((success) => {
        if (success) {
          this.conversations = this.conversations.filter(
            (c) => c.id !== conversationId
          );

          if (this.activeConversationId === conversationId) {
            this.messages = [];
            this.activeConversationId = null;
            this.sessionId = null;
            sessionStorage.removeItem(STORAGE_KEY_CONVERSATION);
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnDestroy() {
    this.stopTypingAnimation();
    this.agentChatService.abort();
    this.streamSubscription?.unsubscribe();
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
    this.renderThrottle$.complete();
  }

  private doNewConversation() {
    this.stopTypingAnimation();
    this.messages = [];
    this.sessionId = null;
    this.activeConversationId = null;
    this.currentStreamingMessageId = null;
    this.currentToolName = null;
    this.isLoading = false;
    this.showConversationList = false;
    this.agentChatService.abort();
    this.streamSubscription?.unsubscribe();
    this.dialogRef.disableClose = false;
    sessionStorage.removeItem(STORAGE_KEY_CONVERSATION);
    this.emitAnalyticsEvent('new_conversation_started');
    this.changeDetectorRef.markForCheck();
  }

  private loadConversations() {
    this.isLoadingConversations = true;
    this.changeDetectorRef.markForCheck();

    this.agentChatService
      .getConversations()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((result) => {
        this.conversations = result.conversations;
        this.nextConversationCursor = result.nextCursor || null;
        this.isLoadingConversations = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  private refreshConversationList() {
    this.agentChatService
      .getConversations()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((result) => {
        this.conversations = result.conversations;
        this.nextConversationCursor = result.nextCursor || null;
        this.changeDetectorRef.markForCheck();
      });
  }

  private startTypingAnimation(agentMessage: ChatMessage) {
    this.typingAgentMessage = agentMessage;
    this.currentSpeed = MIN_CHARS_PER_SEC;
    this.subPixelAccumulator = 0;
    this.lastFrameTime = 0;
    this.markdownRenderer.reset();

    this.ngZone.runOutsideAngular(() => {
      this.animationFrameId = requestAnimationFrame((ts) =>
        this.tickTypingAnimation(ts)
      );
    });
  }

  private tickTypingAnimation(timestamp: number) {
    const msg = this.typingAgentMessage;

    if (!msg) {
      return;
    }

    // Calculate delta time
    let deltaMs = this.lastFrameTime > 0 ? timestamp - this.lastFrameTime : 16;
    this.lastFrameTime = timestamp;

    // Cap delta to prevent text dumps after tab-away
    deltaMs = Math.min(deltaMs, MAX_DELTA_MS);

    const remaining = this.targetContent.length - msg.content.length;

    if (remaining > 0) {
      // Adaptive speed: scales linearly with buffer depth
      const bufferRatio = Math.min(1, remaining / TARGET_LAG_CHARS);
      const targetSpeed =
        MIN_CHARS_PER_SEC +
        (MAX_CHARS_PER_SEC - MIN_CHARS_PER_SEC) * bufferRatio;

      // EMA smoothing to prevent abrupt speed changes
      this.currentSpeed += SPEED_SMOOTHING * (targetSpeed - this.currentSpeed);

      // Delta-time based character advancement
      this.subPixelAccumulator += this.currentSpeed * (deltaMs / 1000);
      const charsToReveal = Math.floor(this.subPixelAccumulator);
      this.subPixelAccumulator -= charsToReveal;

      if (charsToReveal > 0) {
        let targetPos = Math.min(
          msg.content.length + charsToReveal,
          this.targetContent.length
        );

        // Word-snap: advance to next whitespace, bounded by MAX_WORD_SNAP
        const snapStart = targetPos;

        while (
          targetPos < this.targetContent.length &&
          targetPos - snapStart < MAX_WORD_SNAP &&
          !/\s/.test(this.targetContent[targetPos])
        ) {
          targetPos++;
        }

        msg.content = this.targetContent.substring(0, targetPos);

        // Mark dirty — markdown rendering deferred to throttle callback
        this.renderDirty = true;
        this.renderThrottle$.next();
      }
    } else {
      // All content revealed — flush any queued post-processing
      if (this.pendingPostProcessing.length > 0) {
        for (const apply of this.pendingPostProcessing) {
          apply(msg);
        }

        this.pendingPostProcessing = [];
        this.renderDirty = true;
        this.renderThrottle$.next();
      }

      if (this.pendingStreamFinalization) {
        msg.content = this.targetContent;
        msg.streamingHtml = undefined;
        msg.isStreaming = false;
        this.isLoading = false;
        this.currentStreamingMessageId = null;
        this.currentToolName = null;
        this.dialogRef.disableClose = false;
        this.stopTypingAnimation();
        this.ngZone.run(() => {
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        });

        return;
      }
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame((ts) =>
      this.tickTypingAnimation(ts)
    );
  }

  private stopTypingAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.typingAgentMessage = null;
    this.targetContent = '';
    this.pendingPostProcessing = [];
    this.pendingStreamFinalization = false;
    this.renderDirty = false;
    this.currentSpeed = MIN_CHARS_PER_SEC;
    this.subPixelAccumulator = 0;
    this.lastFrameTime = 0;
    this.markdownRenderer.reset();
  }

  private endReasoningPhase(msg: ChatMessage) {
    if (!msg.isReasoningStreaming) {
      return;
    }

    msg.isReasoningStreaming = false;
    const phases = msg.reasoningPhases;

    if (phases?.length) {
      const current = phases[phases.length - 1];
      current.endTime = Date.now();
      msg.totalReasoningDurationMs = phases.reduce(
        (sum, p) => sum + ((p.endTime ?? Date.now()) - p.startTime),
        0
      );
    }
  }

  private handleSSEEvent(event: SSEEvent, agentMessage: ChatMessage) {
    switch (event.type) {
      case 'reasoning_delta':
        if (!agentMessage.isReasoningStreaming) {
          agentMessage.isReasoningStreaming = true;
          const phases = agentMessage.reasoningPhases || [];
          phases.push({
            startTime: Date.now(),
            startOffset: (agentMessage.reasoning || '').length
          });
          agentMessage.reasoningPhases = phases;
        }
        agentMessage.reasoning = (agentMessage.reasoning || '') + event.text;
        this.changeDetectorRef.markForCheck();
        this.scrollToBottom();
        break;

      case 'content_delta':
        this.endReasoningPhase(agentMessage);
        this.targetContent += event.text;
        agentMessage.isVerifying = false;
        this.currentToolName = null;

        if (!this.animationFrameId) {
          this.startTypingAnimation(agentMessage);
        }

        break;

      case 'content_replace':
        // Invalidate markdown cache before updating target
        this.markdownRenderer.invalidate();
        this.targetContent = event.content;

        if (agentMessage.content.length >= this.targetContent.length) {
          // Typing already revealed past the corrected content — update directly
          agentMessage.content = this.targetContent;
        }

        // Always re-render streamingHtml so display matches the corrected content
        agentMessage.streamingHtml = this.markdownRenderer.render(
          agentMessage.content,
          !!agentMessage.isStreaming
        );
        this.changeDetectorRef.markForCheck();

        break;

      case 'tool_use_start': {
        this.endReasoningPhase(agentMessage);
        const tool: ToolUsed = {
          toolName: event.toolName,
          toolId: event.toolId
        };
        agentMessage.toolsUsed = [...(agentMessage.toolsUsed || []), tool];
        agentMessage.currentToolName =
          TOOL_DISPLAY_NAMES[event.toolName] || event.toolName;
        this.currentToolName =
          TOOL_DISPLAY_NAMES[event.toolName] || event.toolName;
        this.changeDetectorRef.markForCheck();
        break;
      }

      case 'tool_result': {
        if (agentMessage.toolsUsed) {
          agentMessage.toolsUsed = agentMessage.toolsUsed.map((t) =>
            t.toolId === event.toolId
              ? { ...t, success: event.success, durationMs: event.duration_ms }
              : t
          );
        }

        agentMessage.currentToolName = null;
        this.currentToolName = null;
        this.changeDetectorRef.markForCheck();
        break;
      }

      case 'verifying':
        this.currentToolName = null;

        if (this.animationFrameId) {
          this.pendingPostProcessing.push((msg) => {
            msg.isVerifying = true;
          });
        } else {
          agentMessage.isVerifying = true;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;

      case 'confidence': {
        const confidence = {
          level: event.level.toLowerCase() as 'high' | 'medium' | 'low',
          score: event.score
        };

        if (this.animationFrameId) {
          this.pendingPostProcessing.push((msg) => {
            msg.confidence = confidence;
            msg.isVerifying = false;
          });
        } else {
          agentMessage.confidence = confidence;
          agentMessage.isVerifying = false;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;
      }

      case 'disclaimer': {
        const disclaimers = event.disclaimers;
        const domainViolations = event.domainViolations;

        if (this.animationFrameId) {
          this.pendingPostProcessing.push((msg) => {
            msg.disclaimers = disclaimers;
            msg.domainViolations = domainViolations;
          });
        } else {
          agentMessage.disclaimers = disclaimers;
          agentMessage.domainViolations = domainViolations;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;
      }

      case 'correction': {
        const correction = event.message;

        if (this.animationFrameId) {
          this.pendingPostProcessing.push((msg) => {
            msg.correction = correction;
          });
        } else {
          agentMessage.correction = correction;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;
      }

      case 'conversation_title': {
        const matchingConversation = this.conversations.find(
          (c) => c.id === event.conversationId
        );

        if (matchingConversation) {
          matchingConversation.title = event.title;
          this.changeDetectorRef.markForCheck();
        }

        break;
      }

      case 'done':
        this.endReasoningPhase(agentMessage);
        this.sessionId = event.sessionId;
        if (event.conversationId) {
          this.activeConversationId = event.conversationId;
          sessionStorage.setItem(
            STORAGE_KEY_CONVERSATION,
            event.conversationId
          );
        }
        agentMessage.interactionId = event.interactionId;
        this.pendingStreamFinalization = true;
        this.refreshConversationList();

        // If no typing animation running, finalize immediately
        if (!this.animationFrameId) {
          if (this.targetContent) {
            agentMessage.content = this.targetContent;
          }
          agentMessage.isStreaming = false;
          agentMessage.streamingHtml = undefined;
          agentMessage.isVerifying = false;
          this.isLoading = false;
          this.currentStreamingMessageId = null;
          this.currentToolName = null;
          this.dialogRef.disableClose = false;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;

      case 'suggestions': {
        const suggestions = event.suggestions;

        if (this.animationFrameId) {
          this.pendingPostProcessing.push((msg) => {
            msg.suggestions = suggestions;
          });
        } else {
          agentMessage.suggestions = suggestions;
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
        }

        break;
      }

      case 'error': {
        this.stopTypingAnimation();

        const errorMessage =
          ERROR_MESSAGES[event.code] ||
          event.message ||
          ERROR_MESSAGES['INTERNAL_ERROR'];

        if (event.code === 'SESSION_EXPIRED') {
          this.sessionId = null;
        }

        agentMessage.content = errorMessage;
        agentMessage.isStreaming = false;
        agentMessage.streamingHtml = undefined;
        agentMessage.isError = true;
        this.isLoading = false;
        this.currentToolName = null;
        this.dialogRef.disableClose = false;
        this.changeDetectorRef.detectChanges();
        this.scrollToBottom();
        break;
      }
    }
  }

  public onSuggestionClick(text: string) {
    this.onSendMessage(text);
  }

  private emitAnalyticsEvent(
    eventName: string,
    data?: Record<string, unknown>
  ) {
    window.dispatchEvent(
      new CustomEvent('gf-analytics', {
        detail: { event: eventName, ...data }
      })
    );
  }

  private resetTextareaHeight() {
    setTimeout(() => {
      this.autosize?.reset();
    });
  }
}
