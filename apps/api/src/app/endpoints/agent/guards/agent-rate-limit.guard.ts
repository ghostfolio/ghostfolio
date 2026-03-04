import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger
} from '@nestjs/common';

@Injectable()
export class AgentRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AgentRateLimitGuard.name);
  private readonly maxRequests: number;
  private readonly windowMs: number;

  // In-memory fallback when Redis is unavailable
  private readonly fallbackCounts = new Map<
    string,
    { count: number; windowStart: number }
  >();

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly redisCacheService: RedisCacheService
  ) {
    this.maxRequests = this.configurationService.get('AGENT_RATE_LIMIT_MAX');
    this.windowMs =
      this.configurationService.get('AGENT_RATE_LIMIT_WINDOW_SECONDS') * 1000;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user.id;
    const windowBucket = Math.floor(Date.now() / this.windowMs);
    const key = `agent:ratelimit:${userId}:${windowBucket}`;

    try {
      // Atomic increment — avoids race condition on concurrent requests
      const count = await this.redisCacheService.increment(key, this.windowMs);

      if (count > this.maxRequests) {
        const retryAfterSeconds = Math.ceil(
          (this.windowMs - (Date.now() % this.windowMs)) / 1000
        );
        this.logger.warn('Agent rate limit exceeded', { userId, count });

        throw new HttpException(
          {
            message:
              'Rate limit exceeded. Please wait before sending another query.',
            retryAfterSeconds
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Redis unavailable — use in-memory sliding window fallback
      this.logger.error('Rate limit Redis check failed, using fallback', error);
      return this.checkFallbackLimit(userId, windowBucket);
    }
  }

  private checkFallbackLimit(userId: string, windowBucket: number): boolean {
    const entry = this.fallbackCounts.get(userId);
    const now = Date.now();

    if (!entry || entry.windowStart !== windowBucket) {
      this.fallbackCounts.set(userId, { count: 1, windowStart: windowBucket });

      // Prune stale entries to prevent memory leak
      if (this.fallbackCounts.size > 10_000) {
        for (const [key, val] of this.fallbackCounts) {
          if (val.windowStart < windowBucket) {
            this.fallbackCounts.delete(key);
          }
        }
      }

      return true;
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (this.windowMs - (now % this.windowMs)) / 1000
      );
      this.logger.warn('Agent rate limit exceeded (fallback)', {
        userId,
        count: entry.count
      });

      throw new HttpException(
        {
          message:
            'Rate limit exceeded. Please wait before sending another query.',
          retryAfterSeconds
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
