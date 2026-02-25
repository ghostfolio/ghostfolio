import { Injectable } from '@nestjs/common';

import type { SessionMessage } from '../contracts/agent-chat.types';

@Injectable()
export class InMemorySessionStore {
  private readonly maxMessagesPerSession = 20;
  private readonly sessions = new Map<string, SessionMessage[]>();

  public append(sessionId: string, message: SessionMessage): SessionMessage[] {
    const existing = this.sessions.get(sessionId) ?? [];
    const next = [...existing, message].slice(-this.maxMessagesPerSession);

    this.sessions.set(sessionId, next);

    return next;
  }

  public getSession(sessionId: string): SessionMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  public resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
