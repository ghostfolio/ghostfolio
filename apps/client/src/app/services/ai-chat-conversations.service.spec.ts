import { TestBed } from '@angular/core/testing';

import { AiChatConversationsService } from './ai-chat-conversations.service';

describe('AiChatConversationsService', () => {
  let service: AiChatConversationsService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(AiChatConversationsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates and selects a new conversation', () => {
    const createdConversation = service.createConversation();

    expect(service.getConversationsSnapshot()).toHaveLength(1);
    expect(service.getCurrentConversationSnapshot()?.id).toBe(createdConversation.id);
    expect(createdConversation.title).toBe('New Chat');
  });

  it('derives title from first user message and falls back for generic prompts', () => {
    const detailedConversation = service.createConversation();
    service.appendUserMessage({
      content: 'Help me rebalance my holdings for lower concentration risk.',
      conversationId: detailedConversation.id
    });

    const updatedDetailedConversation = service.getCurrentConversationSnapshot();

    expect(updatedDetailedConversation?.title).toBe(
      'Help me rebalance my holdings for lower concentr...'
    );

    const genericConversation = service.createConversation();
    service.appendUserMessage({
      content: 'hi',
      conversationId: genericConversation.id
    });

    expect(service.getCurrentConversationSnapshot()?.title).toBe('New Chat');
  });

  it('starts new chats with fresh context and keeps per-conversation session memory', () => {
    const firstConversation = service.createConversation();
    service.setConversationSessionId({
      conversationId: firstConversation.id,
      sessionId: 'session-1'
    });

    const secondConversation = service.createConversation();

    expect(service.getCurrentConversationSnapshot()?.id).toBe(secondConversation.id);
    expect(service.getCurrentConversationSnapshot()?.sessionId).toBeUndefined();

    service.selectConversation(firstConversation.id);

    expect(service.getCurrentConversationSnapshot()?.sessionId).toBe('session-1');
  });

  it('restores conversations and active selection from local storage', () => {
    const firstConversation = service.createConversation();
    service.appendUserMessage({
      content: 'first chat message',
      conversationId: firstConversation.id
    });
    service.setConversationSessionId({
      conversationId: firstConversation.id,
      sessionId: 'session-first'
    });

    const secondConversation = service.createConversation();
    service.appendUserMessage({
      content: 'second chat message',
      conversationId: secondConversation.id
    });

    const restoredService = new AiChatConversationsService();

    expect(restoredService.getConversationsSnapshot()).toHaveLength(2);
    expect(restoredService.getCurrentConversationSnapshot()?.id).toBe(
      secondConversation.id
    );

    restoredService.selectConversation(firstConversation.id);

    expect(restoredService.getCurrentConversationSnapshot()?.sessionId).toBe(
      'session-first'
    );
  });
});
