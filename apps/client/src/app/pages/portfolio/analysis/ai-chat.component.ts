import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import {
  DEFAULT_DATE_RANGE,
  HEADER_KEY_TIMEZONE,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';
import { Filter } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { DataService } from '@ghostfolio/ui/services';

import { Chat } from '@ai-sdk/angular';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IonIcon } from '@ionic/angular/standalone';
import { DefaultChatTransport, isTextUIPart, UIMessage } from 'ai';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  refreshOutline,
  sendOutline,
  stopCircleOutline,
  trashOutline
} from 'ionicons/icons';

const AI_CHAT_CONSENT_KEY_PREFIX = 'ghostfolio.ai-chat.consent';
const AI_CHAT_MAX_MESSAGE_LENGTH = 2000;
const AI_CHAT_MAX_MESSAGES = 12;

interface AiChatRequestMessage {
  content: string;
  role: 'assistant' | 'user';
}

interface SafeMarkdownInlinePart {
  href?: string;
  text: string;
  type: 'code' | 'emphasis' | 'link' | 'strong' | 'text';
}

interface SafeMarkdownListBlock {
  items: SafeMarkdownInlinePart[][];
  type: 'ordered-list' | 'unordered-list';
}

interface SafeMarkdownTextBlock {
  parts: SafeMarkdownInlinePart[];
  type: 'heading' | 'paragraph';
}

type AiChatToolName =
  'getPortfolioHoldings' | 'getPortfolioPerformance' | 'getPortfolioSummary';

type SafeMarkdownBlock = SafeMarkdownListBlock | SafeMarkdownTextBlock;

const filterTypeLabels: Record<Filter['type'], string> = {
  ACCOUNT: $localize`Account`,
  ASSET_CLASS: $localize`Asset class`,
  ASSET_SUB_CLASS: $localize`Asset subclass`,
  DATA_SOURCE: $localize`Data source`,
  HOLDING_TYPE: $localize`Holding type`,
  PRESET_ID: $localize`Preset`,
  SEARCH_QUERY: $localize`Search`,
  SYMBOL: $localize`Symbol`,
  TAG: $localize`Tag`
};

const sourceLabelsByToolName: Record<AiChatToolName, string> = {
  getPortfolioHoldings: $localize`Holdings`,
  getPortfolioPerformance: $localize`Performance`,
  getPortfolioSummary: $localize`Portfolio summary`
};

export function buildAiChatRequestMessages(
  messages: UIMessage[]
): AiChatRequestMessage[] {
  const requestMessages: AiChatRequestMessage[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant' && message.role !== 'user') {
      continue;
    }

    const content = message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join('\n\n')
      .trim()
      .slice(0, AI_CHAT_MAX_MESSAGE_LENGTH);

    if (content) {
      requestMessages.push({
        content,
        role: message.role
      });
    }
  }

  return requestMessages.slice(-AI_CHAT_MAX_MESSAGES);
}

export function getAiChatSourceLabels(message: UIMessage): string[] {
  const sourceLabels = new Set<string>();

  for (const part of message.parts) {
    if (!('state' in part) || part.state !== 'output-available') {
      continue;
    }

    const toolName =
      part.type === 'dynamic-tool'
        ? part.toolName
        : part.type.startsWith('tool-')
          ? part.type.slice('tool-'.length)
          : undefined;

    if (toolName && toolName in sourceLabelsByToolName) {
      sourceLabels.add(sourceLabelsByToolName[toolName as AiChatToolName]);
    }
  }

  return [...sourceLabels];
}

function getSafeLink(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function parseSafeMarkdownInline(value: string) {
  const parts: SafeMarkdownInlinePart[] = [];
  let remainingValue = value;

  const appendText = (text: string) => {
    const previousPart = parts.at(-1);

    if (previousPart?.type === 'text') {
      previousPart.text += text;
    } else {
      parts.push({ text, type: 'text' });
    }
  };

  while (remainingValue) {
    const imageMatch =
      /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/.exec(
        remainingValue
      );

    if (imageMatch) {
      const href = getSafeLink(imageMatch[2]);
      const text = `${$localize`Image`}: ${imageMatch[1] || $localize`Untitled`}`;

      parts.push(href ? { href, text, type: 'link' } : { text, type: 'text' });
      remainingValue = remainingValue.slice(imageMatch[0].length);
      continue;
    }

    const linkMatch =
      /^\[([^\]]+)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/.exec(
        remainingValue
      );

    if (linkMatch) {
      const href = getSafeLink(linkMatch[2]);

      parts.push(
        href
          ? { href, text: linkMatch[1], type: 'link' }
          : { text: linkMatch[1], type: 'text' }
      );
      remainingValue = remainingValue.slice(linkMatch[0].length);
      continue;
    }

    const strongMatch =
      /^\*\*([^*\n]+)\*\*/.exec(remainingValue) ??
      /^__([^_\n]+)__/.exec(remainingValue);

    if (strongMatch) {
      parts.push({ text: strongMatch[1], type: 'strong' });
      remainingValue = remainingValue.slice(strongMatch[0].length);
      continue;
    }

    const emphasisMatch =
      /^\*([^*\n]+)\*/.exec(remainingValue) ??
      /^_([^_\n]+)_/.exec(remainingValue);

    if (emphasisMatch) {
      parts.push({ text: emphasisMatch[1], type: 'emphasis' });
      remainingValue = remainingValue.slice(emphasisMatch[0].length);
      continue;
    }

    const codeMatch = /^`([^`\n]+)`/.exec(remainingValue);

    if (codeMatch) {
      parts.push({ text: codeMatch[1], type: 'code' });
      remainingValue = remainingValue.slice(codeMatch[0].length);
      continue;
    }

    appendText(remainingValue[0]);
    remainingValue = remainingValue.slice(1);
  }

  return parts;
}

export function parseSafeMarkdown(value: string): SafeMarkdownBlock[] {
  const blocks: SafeMarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({
        parts: parseSafeMarkdownInline(paragraphLines.join(' ')),
        type: 'paragraph'
      });
      paragraphLines = [];
    }
  };

  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        parts: parseSafeMarkdownInline(headingMatch[1]),
        type: 'heading'
      });
      continue;
    }

    const unorderedListMatch = /^\s*[-+*]\s+(.+)$/.exec(line);
    const orderedListMatch = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const listMatch = unorderedListMatch ?? orderedListMatch;

    if (listMatch) {
      flushParagraph();

      const type = unorderedListMatch ? 'unordered-list' : 'ordered-list';
      const previousBlock = blocks.at(-1);
      const item = parseSafeMarkdownInline(listMatch[1]);

      if (previousBlock?.type === type) {
        previousBlock.items.push(item);
      } else {
        blocks.push({ items: [item], type });
      }

      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return blocks;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-ai-chat-inline',
  template: `
    @for (part of parts(); track $index) {
      @switch (part.type) {
        @case ('strong') {
          <strong>{{ part.text }}</strong>
        }
        @case ('emphasis') {
          <em>{{ part.text }}</em>
        }
        @case ('code') {
          <code>{{ part.text }}</code>
        }
        @case ('link') {
          <a
            rel="nofollow noopener noreferrer"
            target="_blank"
            [href]="part.href"
            >{{ part.text }}</a
          >
        }
        @default {
          {{ part.text }}
        }
      }
    }
  `
})
class GfAiChatInlineComponent {
  public readonly parts = input.required<SafeMarkdownInlinePart[]>();
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfAiChatInlineComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  selector: 'gf-ai-chat',
  styleUrls: ['./ai-chat.component.scss'],
  templateUrl: './ai-chat.component.html'
})
export class GfAiChatComponent implements OnDestroy {
  public readonly filters = input<Filter[]>([]);
  public readonly model = input('');
  public readonly range = input<DateRange>(DEFAULT_DATE_RANGE);

  public readonly closed = output<void>();

  protected readonly chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/v1/ai/chat',
      credentials: 'same-origin',
      headers: () => {
        const headers: Record<string, string> = {
          [HEADER_KEY_TIMEZONE]:
            Intl?.DateTimeFormat().resolvedOptions().timeZone
        };
        const token = this.tokenStorageService.getToken();

        if (token) {
          headers[HEADER_KEY_TOKEN] = `Bearer ${token}`;
        }

        return headers;
      },
      prepareSendMessagesRequest: ({ headers, messages }) => {
        return {
          api: this.getApiUrl(),
          body: {
            messages: buildAiChatRequestMessages(messages)
          },
          credentials: 'same-origin',
          headers
        };
      }
    })
  });
  protected readonly hasConsent = computed(() => {
    return (
      !!this.model() && this.consentedScopeSignature() === this.scopeSignature()
    );
  });
  protected readonly isBusy = computed(() => {
    return this.chat.status === 'streaming' || this.chat.status === 'submitted';
  });
  protected readonly prompt = signal('');
  protected readonly scopeChips = computed(() => {
    const chips = [
      `${$localize`Date range`}: ${this.getDateRangeLabel(this.range())}`
    ];

    for (const filter of this.filters()) {
      chips.push(
        `${filterTypeLabels[filter.type]}: ${filter.label ?? filter.id}`
      );
    }

    if (this.filters().length === 0) {
      chips.push($localize`All portfolio data`);
    }

    return chips;
  });

  private readonly promptElement =
    viewChild<ElementRef<HTMLTextAreaElement>>('promptInput');
  private readonly consentedScopeSignature = signal<string | undefined>(
    undefined
  );
  private readonly shouldFocusPrompt = signal(true);
  private readonly scopeSignature = computed(() => {
    const filters = this.filters()
      .map(({ id, type }) => ({ id, type }))
      .sort((filterA, filterB) => {
        return `${filterA.type}:${filterA.id}`.localeCompare(
          `${filterB.type}:${filterB.id}`
        );
      });

    return JSON.stringify({
      filters,
      model: this.model(),
      range: this.range()
    });
  });
  private readonly tokenStorageService = inject(TokenStorageService);
  private readonly dataService = inject(DataService);

  public constructor() {
    let previousScopeSignature: string | undefined;

    effect(() => {
      const model = this.model();
      const scopeSignature = this.scopeSignature();

      untracked(() => {
        const hasScopeChanged =
          previousScopeSignature !== undefined &&
          previousScopeSignature !== scopeSignature;
        const consentKey = model ? this.getConsentKey(model) : undefined;
        const storedScopeSignature = consentKey
          ? window.sessionStorage.getItem(consentKey)
          : null;

        if (hasScopeChanged) {
          this.resetChat();

          if (consentKey) {
            window.sessionStorage.removeItem(consentKey);
          }

          this.consentedScopeSignature.set(undefined);
        } else {
          const hasConsent =
            !!consentKey && storedScopeSignature === scopeSignature;

          if (consentKey && storedScopeSignature !== null && !hasConsent) {
            window.sessionStorage.removeItem(consentKey);
          }

          this.consentedScopeSignature.set(
            hasConsent ? scopeSignature : undefined
          );
        }

        previousScopeSignature = scopeSignature;
      });
    });

    effect(() => {
      const hasConsent = this.hasConsent();
      const promptElement = this.promptElement();
      const shouldFocusPrompt = this.shouldFocusPrompt();

      if (hasConsent && promptElement && shouldFocusPrompt) {
        queueMicrotask(() => {
          promptElement.nativeElement.focus();
          untracked(() => {
            this.shouldFocusPrompt.set(false);
          });
        });
      }
    });

    addIcons({
      closeOutline,
      refreshOutline,
      sendOutline,
      stopCircleOutline,
      trashOutline
    });
  }

  public ngOnDestroy() {
    this.resetChat();
  }

  protected getMessageText(message: UIMessage) {
    return message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join('\n\n');
  }

  protected getSafeMarkdownBlocks(message: UIMessage) {
    return parseSafeMarkdown(this.getMessageText(message));
  }

  protected getSourceLabels(message: UIMessage) {
    return getAiChatSourceLabels(message);
  }

  protected onAcceptConsent() {
    window.sessionStorage.setItem(
      this.getConsentKey(this.model()),
      this.scopeSignature()
    );
    this.shouldFocusPrompt.set(true);
    this.consentedScopeSignature.set(this.scopeSignature());
  }

  protected onClear() {
    this.resetChat();
  }

  protected onClose() {
    this.resetChat();
    this.closed.emit();
  }

  protected onInput(event: Event) {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing &&
      !this.isBusy()
    ) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected onRetry() {
    this.chat.clearError();
    void this.chat.regenerate();
  }

  protected onStop() {
    void this.chat.stop();
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  private getApiUrl() {
    const queryParams = this.dataService
      .buildFiltersAsQueryParams({ filters: this.filters() })
      .append('range', this.range());

    return `/api/v1/ai/chat?${queryParams.toString()}`;
  }

  private getConsentKey(model: string) {
    return `${AI_CHAT_CONSENT_KEY_PREFIX}:${model}`;
  }

  private getDateRangeLabel(range: DateRange) {
    const labels: Record<string, string> = {
      '1d': $localize`Today`,
      '1y': $localize`1 year`,
      '5y': $localize`5 years`,
      max: $localize`Max`,
      mtd: $localize`Month to date`,
      wtd: $localize`Week to date`,
      ytd: $localize`Year to date`
    };

    return labels[range] ?? range;
  }

  private resetChat() {
    void this.chat.stop();
    this.chat.messages = [];
    this.chat.clearError();
    this.prompt.set('');
  }

  private sendMessage() {
    const prompt = this.prompt().trim();

    if (!this.hasConsent() || !prompt || this.isBusy()) {
      return;
    }

    this.prompt.set('');
    void this.chat.sendMessage({ text: prompt });
  }
}
