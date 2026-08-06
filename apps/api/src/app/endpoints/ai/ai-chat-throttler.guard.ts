import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

const AI_CHAT_RATE_LIMIT = 5;
const AI_CHAT_RATE_LIMIT_TTL = 60_000;
const AI_CHAT_THROTTLER_NAME = 'ai-chat';

@Injectable()
export class AiChatThrottlerGuard implements CanActivate {
  public constructor(
    @Inject(ThrottlerStorage)
    private readonly throttlerStorage: ThrottlerStorage
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string };
    }>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException();
    }

    let isBlocked: boolean;
    let totalHits: number;

    try {
      ({ isBlocked, totalHits } = await this.throttlerStorage.increment(
        `ai-chat:${userId}`,
        AI_CHAT_RATE_LIMIT_TTL,
        AI_CHAT_RATE_LIMIT,
        AI_CHAT_RATE_LIMIT_TTL,
        AI_CHAT_THROTTLER_NAME
      ));
    } catch {
      throw new ServiceUnavailableException(
        'AI portfolio chat is temporarily unavailable'
      );
    }

    if (isBlocked || totalHits > AI_CHAT_RATE_LIMIT) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
