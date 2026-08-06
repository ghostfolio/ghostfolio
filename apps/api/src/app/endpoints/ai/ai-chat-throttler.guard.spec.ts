import {
  ExecutionContext,
  HttpStatus,
  ServiceUnavailableException
} from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';

import { AiChatThrottlerGuard } from './ai-chat-throttler.guard';

describe('AiChatThrottlerGuard', () => {
  let guard: AiChatThrottlerGuard;
  let storage: ThrottlerStorageService;

  beforeEach(() => {
    storage = new ThrottlerStorageService();
    guard = new AiChatThrottlerGuard(storage);
  });

  afterEach(() => {
    storage.onApplicationShutdown();
  });

  it('allows five requests and rejects the sixth for one user', async () => {
    const context = createExecutionContext('user-1');

    for (let requestCount = 0; requestCount < 5; requestCount++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });
  });

  it('tracks authenticated users independently', async () => {
    const firstUser = createExecutionContext('user-1');
    const secondUser = createExecutionContext('user-2');

    for (let requestCount = 0; requestCount < 5; requestCount++) {
      await guard.canActivate(firstUser);
    }

    await expect(guard.canActivate(secondUser)).resolves.toBe(true);
    await expect(guard.canActivate(firstUser)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });
  });

  it('fails closed when rate-limit storage is unavailable', async () => {
    const unavailableStorage: ThrottlerStorage = {
      increment: jest.fn().mockRejectedValue(new Error('storage unavailable'))
    };
    const unavailableGuard = new AiChatThrottlerGuard(unavailableStorage);

    await expect(
      unavailableGuard.canActivate(createExecutionContext('user-1'))
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function createExecutionContext(userId: string) {
  return {
    switchToHttp: () => {
      return {
        getRequest: () => ({ user: { id: userId } })
      };
    }
  } as ExecutionContext;
}
