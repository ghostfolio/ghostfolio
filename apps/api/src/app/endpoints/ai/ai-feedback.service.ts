import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AiAgentFeedbackResponse } from './ai-agent.interfaces';
import { AiObservabilityService } from './ai-observability.service';

const AI_AGENT_FEEDBACK_TTL_IN_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AiFeedbackService {
  public constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly aiObservabilityService: AiObservabilityService
  ) {}

  public async submitFeedback({
    comment,
    rating,
    sessionId,
    userId
  }: {
    comment?: string;
    rating: 'down' | 'up';
    sessionId: string;
    userId: string;
  }): Promise<AiAgentFeedbackResponse> {
    const feedbackId = randomUUID();
    const normalizedComment = comment?.trim();
    const normalizedSessionId = sessionId.trim();

    await this.redisCacheService.set(
      this.getFeedbackKey({
        feedbackId,
        sessionId: normalizedSessionId,
        userId
      }),
      JSON.stringify({
        comment: normalizedComment,
        createdAt: new Date().toISOString(),
        feedbackId,
        rating,
        sessionId: normalizedSessionId,
        userId
      }),
      AI_AGENT_FEEDBACK_TTL_IN_MS
    );

    await this.aiObservabilityService.recordFeedback({
      comment: normalizedComment,
      feedbackId,
      rating,
      sessionId: normalizedSessionId,
      userId
    });

    return {
      accepted: true,
      feedbackId
    };
  }

  private getFeedbackKey({
    feedbackId,
    sessionId,
    userId
  }: {
    feedbackId: string;
    sessionId: string;
    userId: string;
  }) {
    return `ai-agent-feedback-${userId}-${sessionId}-${feedbackId}`;
  }
}
