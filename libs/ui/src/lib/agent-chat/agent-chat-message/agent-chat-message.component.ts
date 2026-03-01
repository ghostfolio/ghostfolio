import { animate, style, transition, trigger } from '@angular/animations';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DoCheck,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonIcon } from '@ionic/angular/standalone';
import { formatDistanceToNowStrict } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bulbOutline,
  chevronDownOutline,
  chevronUpOutline,
  constructOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  thumbsDownOutline,
  thumbsUpOutline,
  warningOutline
} from 'ionicons/icons';

import { ChatMessage, TOOL_DISPLAY_NAMES } from '../interfaces/interfaces';
import { GfMarkdownPipe } from '../pipes/markdown.pipe';

@Component({
  animations: [
    trigger('messageEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(0.5rem)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    GfMarkdownPipe,
    IonIcon,
    MatButtonModule,
    MatIconModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-agent-chat-message',
  styleUrls: ['./agent-chat-message.scss'],
  templateUrl: './agent-chat-message.html'
})
export class GfAgentChatMessageComponent implements DoCheck, OnDestroy, OnInit {
  @Input() content: string = '';
  @Input() isStreaming: boolean = false;
  @Input() message: ChatMessage;
  @Input() skipAnimation = false;

  @Output() feedbackChanged = new EventEmitter<{
    rating: 'positive' | 'negative' | null;
  }>();
  @Output() retryRequested = new EventEmitter<void>();
  @Output() suggestionClicked = new EventEmitter<string>();

  public isReasoningExpanded = false;
  public isSourcesExpanded = false;
  public reasoningLabel = '';

  private cachedRelativeTimestamp: string | null = null;
  private cachedStreamingHtml: string | undefined;
  private cachedSafeHtml: SafeHtml | null = null;
  private reasoningTimerInterval: ReturnType<typeof setInterval> | null = null;
  private timestampRefreshInterval: ReturnType<typeof setInterval> | null =
    null;
  private wasReasoningStreaming = false;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private clipboard: Clipboard,
    private domSanitizer: DomSanitizer
  ) {
    addIcons({
      alertCircleOutline,
      bulbOutline,
      chevronDownOutline,
      chevronUpOutline,
      constructOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      thumbsDownOutline,
      thumbsUpOutline,
      warningOutline
    });
  }

  public ngOnInit() {
    this.cachedRelativeTimestamp = this.computeRelativeTimestamp();
    this.timestampRefreshInterval = setInterval(() => {
      const updated = this.computeRelativeTimestamp();

      if (updated !== this.cachedRelativeTimestamp) {
        this.cachedRelativeTimestamp = updated;
        this.changeDetectorRef.markForCheck();
      }
    }, 60_000);
  }

  public ngDoCheck() {
    const isNowStreaming = !!this.message?.isReasoningStreaming;

    if (isNowStreaming && !this.wasReasoningStreaming) {
      this.isReasoningExpanded = true;
      this.startReasoningTimer();
    } else if (!isNowStreaming && this.wasReasoningStreaming) {
      this.isReasoningExpanded = false;
      this.stopReasoningTimer();
      this.updateReasoningLabel();
    }

    this.wasReasoningStreaming = isNowStreaming;
  }

  public ngOnDestroy() {
    this.stopReasoningTimer();

    if (this.timestampRefreshInterval !== null) {
      clearInterval(this.timestampRefreshInterval);
      this.timestampRefreshInterval = null;
    }
  }

  @HostListener('click', ['$event'])
  public onCodeCopyClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const btn = target.closest('.code-copy-btn') as HTMLElement;

    if (!btn) {
      return;
    }

    event.preventDefault();
    const encodedCode = btn.getAttribute('data-code');

    if (encodedCode) {
      this.clipboard.copy(decodeURIComponent(encodedCode));
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 2000);
    }
  }

  public get relativeTimestamp(): string | null {
    return this.cachedRelativeTimestamp;
  }

  public get safeStreamingHtml(): SafeHtml | null {
    const html = this.message?.streamingHtml;

    if (!html) {
      this.cachedStreamingHtml = undefined;
      this.cachedSafeHtml = null;

      return null;
    }

    // Only re-wrap if the string reference changed
    if (html !== this.cachedStreamingHtml) {
      this.cachedStreamingHtml = html;
      this.cachedSafeHtml = this.domSanitizer.bypassSecurityTrustHtml(html);
    }

    return this.cachedSafeHtml;
  }

  public getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] || toolName;
  }

  public getConfidenceBadgeClass(): string {
    const level = this.message.confidence?.level?.toLowerCase();

    if (level === 'low') {
      return 'confidence-low';
    } else if (level === 'medium') {
      return 'confidence-medium';
    }

    return 'confidence-high';
  }

  public onToggleReasoning() {
    this.isReasoningExpanded = !this.isReasoningExpanded;
  }

  public onToggleSources() {
    this.isSourcesExpanded = !this.isSourcesExpanded;
  }

  public onFeedback(rating: 'positive' | 'negative') {
    const newRating = this.message.feedbackRating === rating ? null : rating;
    this.feedbackChanged.emit({ rating: newRating });
  }

  public onRetry() {
    this.retryRequested.emit();
  }

  public onSuggestionClick(text: string) {
    this.suggestionClicked.emit(text);
  }

  private startReasoningTimer() {
    this.stopReasoningTimer();
    this.reasoningLabel = $localize`Thinking...`;
    this.reasoningTimerInterval = setInterval(() => {
      if (!this.message?.isReasoningStreaming) {
        this.stopReasoningTimer();
        return;
      }

      const phases = this.message.reasoningPhases;

      if (!phases?.length) {
        return;
      }

      const totalMs = phases.reduce(
        (sum, p) => sum + ((p.endTime ?? Date.now()) - p.startTime),
        0
      );
      const seconds = Math.round(totalMs / 1000);

      this.reasoningLabel =
        seconds < 1
          ? $localize`Thinking...`
          : $localize`Thinking for ${seconds}s...`;
      this.changeDetectorRef.markForCheck();
    }, 500);
  }

  private stopReasoningTimer() {
    if (this.reasoningTimerInterval !== null) {
      clearInterval(this.reasoningTimerInterval);
      this.reasoningTimerInterval = null;
    }
  }

  private computeRelativeTimestamp(): string | null {
    if (!this.message?.timestamp) {
      return null;
    }

    const diffMs = Date.now() - this.message.timestamp.getTime();

    if (diffMs < 60_000) {
      return $localize`just now`;
    }

    return formatDistanceToNowStrict(this.message.timestamp, {
      addSuffix: true
    });
  }

  private updateReasoningLabel() {
    const totalMs = this.message?.totalReasoningDurationMs;

    if (!totalMs) {
      this.reasoningLabel = $localize`Thought`;
      return;
    }

    const seconds = Math.round(totalMs / 1000);

    this.reasoningLabel =
      seconds < 1
        ? $localize`Thought for <1s`
        : $localize`Thought for ${seconds}s`;
  }
}
