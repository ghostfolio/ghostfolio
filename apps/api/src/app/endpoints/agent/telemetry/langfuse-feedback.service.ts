import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LangfuseFeedbackService {
  private readonly logger = new Logger(LangfuseFeedbackService.name);

  public async submitFeedback(params: {
    traceId: string;
    rating: string;
    comment?: string;
    userId: string;
  }): Promise<void> {
    const baseUrl = process.env.LANGFUSE_BASE_URL;
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;

    if (!baseUrl || !publicKey || !secretKey) {
      this.logger.debug(
        'Langfuse not configured, skipping feedback submission'
      );
      return;
    }

    try {
      const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
      const score = params.rating === 'positive' ? 1 : 0;

      const response = await fetch(`${baseUrl}/api/public/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify({
          name: 'user-feedback',
          traceId: params.traceId,
          value: score,
          comment: params.comment,
          dataType: 'NUMERIC'
        })
      });

      if (!response.ok) {
        this.logger.warn(
          `Langfuse feedback submission failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      this.logger.warn('Failed to submit feedback to Langfuse', error);
    }
  }
}
