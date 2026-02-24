import { AiFeedbackService } from './ai-feedback.service';

describe('AiFeedbackService', () => {
  let redisCacheService: { set: jest.Mock };
  let aiObservabilityService: { recordFeedback: jest.Mock };
  let subject: AiFeedbackService;

  beforeEach(() => {
    redisCacheService = {
      set: jest.fn().mockResolvedValue(undefined)
    };
    aiObservabilityService = {
      recordFeedback: jest.fn().mockResolvedValue(undefined)
    };

    subject = new AiFeedbackService(
      redisCacheService as never,
      aiObservabilityService as never
    );
  });

  it('stores feedback payload and emits observability event', async () => {
    const response = await subject.submitFeedback({
      comment: 'Useful answer',
      rating: 'up',
      sessionId: 'session-feedback',
      userId: 'user-feedback'
    });

    expect(redisCacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(
        /^ai-agent-feedback-user-feedback-session-feedback-[0-9a-f-]+$/
      ),
      expect.any(String),
      30 * 24 * 60 * 60 * 1000
    );
    expect(aiObservabilityService.recordFeedback).toHaveBeenCalledWith({
      comment: 'Useful answer',
      feedbackId: response.feedbackId,
      rating: 'up',
      sessionId: 'session-feedback',
      userId: 'user-feedback'
    });
    expect(response).toEqual({
      accepted: true,
      feedbackId: expect.any(String)
    });
  });
});
