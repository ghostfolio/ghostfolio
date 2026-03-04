import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';

const MAX_TITLE_LENGTH = 50;
const SMART_TITLE_TIMEOUT_MS = 5000;

@Injectable()
export class AgentConversationService {
  private readonly logger = new Logger(AgentConversationService.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService
  ) {}

  public async listConversations(userId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);

    const conversations = await this.prismaService.agentConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: take + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1
      }),
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { messages: true } }
      }
    });

    const hasMore = conversations.length > take;
    const items = hasMore ? conversations.slice(0, take) : conversations;

    return {
      conversations: items.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined
    };
  }

  public async getConversation(id: string, userId: string) {
    const conversation = await this.prismaService.agentConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            toolsUsed: true,
            confidence: true,
            disclaimers: true,
            createdAt: true
          }
        }
      }
    });

    return conversation;
  }

  public async createConversation(userId: string, title?: string) {
    return this.prismaService.agentConversation.create({
      data: {
        userId,
        title: title || null
      }
    });
  }

  public async updateSdkSessionId(id: string, sdkSessionId: string) {
    return this.prismaService.agentConversation.update({
      where: { id },
      data: { sdkSessionId }
    });
  }

  public async addMessage(
    conversationId: string,
    role: string,
    content: string,
    metadata?: {
      toolsUsed?: unknown[];
      confidence?: { level: string; score: number };
      disclaimers?: string[];
      interactionId?: string;
    }
  ) {
    return this.prismaService.agentMessage.create({
      data: {
        conversationId,
        role,
        content,
        toolsUsed: metadata?.toolsUsed
          ? JSON.parse(JSON.stringify(metadata.toolsUsed))
          : undefined,
        confidence: metadata?.confidence
          ? JSON.parse(JSON.stringify(metadata.confidence))
          : undefined,
        disclaimers: metadata?.disclaimers || [],
        interactionId: metadata?.interactionId
      }
    });
  }

  public async deleteConversation(id: string, userId: string) {
    const conversation = await this.prismaService.agentConversation.findFirst({
      where: { id, userId }
    });

    if (!conversation) {
      return null;
    }

    return this.prismaService.agentConversation.delete({
      where: { id }
    });
  }

  public async updateTitle(id: string, title: string) {
    return this.prismaService.agentConversation.update({
      where: { id },
      data: { title }
    });
  }

  public async generateSmartTitle(
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    const apiKey = this.configurationService.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return this.generateTitle(userMessage);
    }

    // Sanitize inputs to prevent prompt injection via title generation
    const sanitizedUser = this.sanitizeTitleInput(userMessage).slice(0, 200);
    const sanitizedAssistant = this.sanitizeTitleInput(assistantResponse).slice(
      0,
      300
    );

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SMART_TITLE_TIMEOUT_MS
    );

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 30,
          messages: [
            {
              role: 'user',
              content: `Generate a concise 3-6 word title for this conversation. Return ONLY the title, no quotes or punctuation.\n\nUser: ${sanitizedUser}\nAssistant: ${sanitizedAssistant}`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.generateTitle(userMessage);
      }

      const data = await response.json();
      const rawTitle = data?.content?.[0]?.text?.trim();
      const title = rawTitle ? this.sanitizeTitleInput(rawTitle) : null;

      if (title && title.length > 0 && title.length <= MAX_TITLE_LENGTH) {
        return title;
      }

      return this.generateTitle(userMessage);
    } catch {
      clearTimeout(timeout);
      this.logger.debug('Smart title generation failed, using fallback');

      return this.generateTitle(userMessage);
    }
  }

  private sanitizeTitleInput(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/[\p{Cc}\p{Cf}]/gu, (match) =>
        ['\n', '\r', '\t', ' '].includes(match) ? ' ' : ''
      )
      .trim();
  }

  public generateTitle(firstMessage: string): string {
    let title = firstMessage.trim();

    if (title.length <= MAX_TITLE_LENGTH) {
      return title;
    }

    title = title.substring(0, MAX_TITLE_LENGTH);

    const lastSpace = title.lastIndexOf(' ');

    if (lastSpace > MAX_TITLE_LENGTH * 0.6) {
      title = title.substring(0, lastSpace);
    }

    return title + '...';
  }
}
