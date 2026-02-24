import { AiAgentChatResponse } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AiChatFeedbackState {
  feedbackId?: string;
  isSubmitting: boolean;
  rating?: 'down' | 'up';
}

export interface AiChatMessage {
  content: string;
  createdAt: Date;
  feedback?: AiChatFeedbackState;
  id: number;
  response?: AiAgentChatResponse;
  role: 'assistant' | 'user';
}

export interface AiChatConversation {
  createdAt: Date;
  id: string;
  messages: AiChatMessage[];
  nextMessageId: number;
  sessionId?: string;
  title: string;
  updatedAt: Date;
}

type StoredAiChatMessage = Omit<AiChatMessage, 'createdAt'> & {
  createdAt: string;
};

type StoredAiChatConversation = Omit<
  AiChatConversation,
  'createdAt' | 'messages' | 'updatedAt'
> & {
  createdAt: string;
  messages: StoredAiChatMessage[];
  updatedAt: string;
};

@Injectable({
  providedIn: 'root'
})
export class AiChatConversationsService {
  private readonly STORAGE_KEY_ACTIVE_CONVERSATION_ID =
    'gf_ai_chat_active_conversation_id_v1';
  private readonly STORAGE_KEY_CONVERSATIONS = 'gf_ai_chat_conversations_v1';
  private readonly DEFAULT_CONVERSATION_TITLE = 'New Chat';
  private readonly GENERIC_FIRST_MESSAGE_PATTERN =
    /^(hi|hello|hey|yo|hola|new chat|start)$/i;
  private readonly MAX_STORED_CONVERSATIONS = 50;
  private readonly MAX_STORED_MESSAGES = 200;

  private activeConversationIdSubject = new BehaviorSubject<string | undefined>(
    undefined
  );
  private conversationsSubject = new BehaviorSubject<AiChatConversation[]>([]);

  public constructor() {
    this.restoreState();
  }

  public appendAssistantMessage({
    content,
    conversationId,
    feedback,
    response
  }: {
    content: string;
    conversationId: string;
    feedback?: AiChatFeedbackState;
    response?: AiAgentChatResponse;
  }) {
    return this.appendMessage({
      content,
      conversationId,
      feedback,
      response,
      role: 'assistant'
    });
  }

  public appendUserMessage({
    content,
    conversationId
  }: {
    content: string;
    conversationId: string;
  }) {
    return this.appendMessage({
      content,
      conversationId,
      role: 'user'
    });
  }

  public createConversation({
    select = true,
    title
  }: {
    select?: boolean;
    title?: string;
  } = {}): AiChatConversation {
    const now = new Date();
    const conversation: AiChatConversation = {
      createdAt: now,
      id: this.getConversationId(),
      messages: [],
      nextMessageId: 0,
      title: title?.trim() || this.DEFAULT_CONVERSATION_TITLE,
      updatedAt: now
    };

    const conversations = this.conversationsSubject.getValue();
    this.setState({
      activeConversationId:
        select || !this.activeConversationIdSubject.getValue()
          ? conversation.id
          : this.activeConversationIdSubject.getValue(),
      conversations: [conversation, ...conversations]
    });

    return conversation;
  }

  public deleteConversation(id: string) {
    const conversations = this.conversationsSubject
      .getValue()
      .filter((conversation) => {
        return conversation.id !== id;
      });

    const activeConversationId = this.activeConversationIdSubject.getValue();

    this.setState({
      activeConversationId:
        activeConversationId === id ? conversations[0]?.id : activeConversationId,
      conversations
    });
  }

  public getActiveConversationId() {
    return this.activeConversationIdSubject.asObservable();
  }

  public getConversations() {
    return this.conversationsSubject.asObservable();
  }

  public getConversationsSnapshot() {
    return this.conversationsSubject.getValue();
  }

  public getCurrentConversation() {
    return combineLatest([
      this.conversationsSubject,
      this.activeConversationIdSubject
    ]).pipe(
      map(([conversations, activeConversationId]) => {
        return conversations.find(({ id }) => {
          return id === activeConversationId;
        });
      })
    );
  }

  public getCurrentConversationSnapshot() {
    const activeConversationId = this.activeConversationIdSubject.getValue();

    return this.conversationsSubject.getValue().find(({ id }) => {
      return id === activeConversationId;
    });
  }

  public renameConversation({ id, title }: { id: string; title: string }) {
    return this.updateConversation(id, (conversation) => {
      return {
        ...conversation,
        title: title.trim() || this.DEFAULT_CONVERSATION_TITLE,
        updatedAt: new Date()
      };
    });
  }

  public selectConversation(id: string) {
    const hasConversation = this.conversationsSubject.getValue().some((conversation) => {
      return conversation.id === id;
    });

    if (!hasConversation) {
      return false;
    }

    this.setState({
      activeConversationId: id,
      conversations: this.conversationsSubject.getValue()
    });

    return true;
  }

  public setConversationSessionId({
    conversationId,
    sessionId
  }: {
    conversationId: string;
    sessionId: string;
  }) {
    return this.updateConversation(conversationId, (conversation) => {
      return {
        ...conversation,
        sessionId,
        updatedAt: new Date()
      };
    });
  }

  public updateMessage({
    conversationId,
    messageId,
    updater
  }: {
    conversationId: string;
    messageId: number;
    updater: (message: AiChatMessage) => AiChatMessage;
  }) {
    return this.updateConversation(conversationId, (conversation) => {
      const messageIndex = conversation.messages.findIndex(({ id }) => {
        return id === messageId;
      });

      if (messageIndex < 0) {
        return conversation;
      }

      const updatedMessages = conversation.messages.map((message, index) => {
        return index === messageIndex ? updater(message) : message;
      });

      return {
        ...conversation,
        messages: updatedMessages
      };
    });
  }

  private appendMessage({
    content,
    conversationId,
    feedback,
    response,
    role
  }: {
    content: string;
    conversationId: string;
    feedback?: AiChatFeedbackState;
    response?: AiAgentChatResponse;
    role: AiChatMessage['role'];
  }) {
    let appendedMessage: AiChatMessage | undefined;

    this.updateConversation(conversationId, (conversation) => {
      const now = new Date();
      appendedMessage = {
        content,
        createdAt: now,
        feedback,
        id: conversation.nextMessageId,
        response,
        role
      };

      const hasExistingUserMessage = conversation.messages.some((message) => {
        return message.role === 'user';
      });

      return {
        ...conversation,
        messages: [...conversation.messages, appendedMessage].slice(
          -this.MAX_STORED_MESSAGES
        ),
        nextMessageId: conversation.nextMessageId + 1,
        title:
          role === 'user' && !hasExistingUserMessage
            ? this.getConversationTitleFromFirstMessage(content)
            : conversation.title,
        updatedAt: now
      };
    });

    return appendedMessage;
  }

  private getConversationId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private getConversationTitleFromFirstMessage(content: string) {
    const normalized = this.stripMarkdown(content)
      .replace(/\s+/g, ' ')
      .trim();

    if (
      normalized.length < 10 ||
      this.GENERIC_FIRST_MESSAGE_PATTERN.test(normalized) ||
      this.isEmojiOnly(normalized)
    ) {
      return this.DEFAULT_CONVERSATION_TITLE;
    }

    if (normalized.length > 48) {
      return `${normalized.slice(0, 48).trimEnd()}...`;
    }

    return normalized;
  }

  private getStorage() {
    try {
      return globalThis.localStorage;
    } catch {
      return undefined;
    }
  }

  private isEmojiOnly(content: string) {
    return /^\p{Emoji}+$/u.test(content.replace(/\s+/g, ''));
  }

  private persistState() {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        this.STORAGE_KEY_CONVERSATIONS,
        JSON.stringify(
          this.conversationsSubject.getValue().map((conversation) => {
            return this.toStoredConversation(conversation);
          })
        )
      );

      const activeConversationId = this.activeConversationIdSubject.getValue();

      if (activeConversationId) {
        storage.setItem(this.STORAGE_KEY_ACTIVE_CONVERSATION_ID, activeConversationId);
      } else {
        storage.removeItem(this.STORAGE_KEY_ACTIVE_CONVERSATION_ID);
      }
    } catch {
      // Keep chat usable when browser storage is unavailable or full.
    }
  }

  private restoreState() {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    const rawConversations = storage.getItem(this.STORAGE_KEY_CONVERSATIONS);

    if (!rawConversations) {
      return;
    }

    try {
      const parsed = JSON.parse(rawConversations) as unknown;

      if (!Array.isArray(parsed)) {
        return;
      }

      const conversations = parsed
        .map((conversation) => {
          return this.toConversation(conversation);
        })
        .filter((conversation): conversation is AiChatConversation => {
          return Boolean(conversation);
        });

      const sortedConversations = this.sortConversations(conversations).slice(
        0,
        this.MAX_STORED_CONVERSATIONS
      );

      const activeConversationId = storage.getItem(
        this.STORAGE_KEY_ACTIVE_CONVERSATION_ID
      );
      const hasActiveConversation = sortedConversations.some((conversation) => {
        return conversation.id === activeConversationId;
      });

      this.conversationsSubject.next(sortedConversations);
      this.activeConversationIdSubject.next(
        hasActiveConversation ? activeConversationId : sortedConversations[0]?.id
      );
    } catch {
      storage.removeItem(this.STORAGE_KEY_ACTIVE_CONVERSATION_ID);
      storage.removeItem(this.STORAGE_KEY_CONVERSATIONS);
    }
  }

  private setState({
    activeConversationId,
    conversations
  }: {
    activeConversationId?: string;
    conversations: AiChatConversation[];
  }) {
    const sortedConversations = this.sortConversations(conversations).slice(
      0,
      this.MAX_STORED_CONVERSATIONS
    );

    const hasActiveConversation = sortedConversations.some((conversation) => {
      return conversation.id === activeConversationId;
    });

    this.conversationsSubject.next(sortedConversations);
    this.activeConversationIdSubject.next(
      hasActiveConversation ? activeConversationId : sortedConversations[0]?.id
    );
    this.persistState();
  }

  private sortConversations(conversations: AiChatConversation[]) {
    return [...conversations].sort((a, b) => {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  private stripMarkdown(content: string) {
    return content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/(\[|\]|_|#|>|~|\*)/g, ' ')
      .trim();
  }

  private toConversation(
    conversation: unknown
  ): AiChatConversation | undefined {
    if (!conversation || typeof conversation !== 'object') {
      return undefined;
    }

    const storedConversation = conversation as Partial<StoredAiChatConversation>;

    if (
      typeof storedConversation.id !== 'string' ||
      typeof storedConversation.title !== 'string' ||
      typeof storedConversation.createdAt !== 'string' ||
      typeof storedConversation.updatedAt !== 'string' ||
      !Array.isArray(storedConversation.messages)
    ) {
      return undefined;
    }

    const createdAt = new Date(storedConversation.createdAt);
    const updatedAt = new Date(storedConversation.updatedAt);

    if (
      Number.isNaN(createdAt.getTime()) ||
      Number.isNaN(updatedAt.getTime()) ||
      (storedConversation.sessionId &&
        typeof storedConversation.sessionId !== 'string')
    ) {
      return undefined;
    }

    const messages = storedConversation.messages
      .map((message) => {
        return this.toMessage(message);
      })
      .filter((message): message is AiChatMessage => {
        return Boolean(message);
      })
      .slice(-this.MAX_STORED_MESSAGES);

    const nextMessageId =
      Math.max(
        typeof storedConversation.nextMessageId === 'number'
          ? storedConversation.nextMessageId
          : -1,
        messages.reduce((maxId, message) => {
          return Math.max(maxId, message.id);
        }, -1) + 1
      ) || 0;

    return {
      createdAt,
      id: storedConversation.id,
      messages,
      nextMessageId,
      sessionId: storedConversation.sessionId?.trim() || undefined,
      title: storedConversation.title.trim() || this.DEFAULT_CONVERSATION_TITLE,
      updatedAt
    };
  }

  private toMessage(message: unknown): AiChatMessage | undefined {
    if (!message || typeof message !== 'object') {
      return undefined;
    }

    const storedMessage = message as Partial<StoredAiChatMessage>;

    if (
      typeof storedMessage.content !== 'string' ||
      typeof storedMessage.id !== 'number' ||
      typeof storedMessage.createdAt !== 'string' ||
      (storedMessage.role !== 'assistant' && storedMessage.role !== 'user')
    ) {
      return undefined;
    }

    const createdAt = new Date(storedMessage.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return undefined;
    }

    return {
      content: storedMessage.content,
      createdAt,
      feedback: storedMessage.feedback,
      id: storedMessage.id,
      response: storedMessage.response,
      role: storedMessage.role
    };
  }

  private toStoredConversation(
    conversation: AiChatConversation
  ): StoredAiChatConversation {
    return {
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      messages: conversation.messages.map((message) => {
        return {
          ...message,
          createdAt: message.createdAt.toISOString()
        };
      }),
      updatedAt: conversation.updatedAt.toISOString()
    };
  }

  private updateConversation(
    id: string,
    updater: (conversation: AiChatConversation) => AiChatConversation
  ) {
    let hasUpdatedConversation = false;

    const conversations = this.conversationsSubject.getValue().map((conversation) => {
      if (conversation.id !== id) {
        return conversation;
      }

      hasUpdatedConversation = true;

      return updater(conversation);
    });

    if (!hasUpdatedConversation) {
      return false;
    }

    this.setState({
      activeConversationId: this.activeConversationIdSubject.getValue(),
      conversations
    });

    return true;
  }
}
