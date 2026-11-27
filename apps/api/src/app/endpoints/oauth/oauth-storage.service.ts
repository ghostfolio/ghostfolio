import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';

import { Injectable } from '@nestjs/common';
import ms from 'ms';

import { OAuthAuthorizationCode } from './interfaces/oauth-authorization-code.interface';

@Injectable()
export class OAuthStorageService {
  private static readonly CODE_KEY_PREFIX = 'oauth:code:';
  private static readonly DEFAULT_TTL_MS = ms('5 minutes');

  public constructor(private readonly redisCacheService: RedisCacheService) {}

  public async storeAuthorizationCode(
    code: string,
    data: OAuthAuthorizationCode,
    ttlMs: number = OAuthStorageService.DEFAULT_TTL_MS
  ): Promise<void> {
    await this.redisCacheService.set(
      this.getCodeKey(code),
      JSON.stringify(data),
      ttlMs
    );
  }

  public async consumeAuthorizationCode(
    code: string
  ): Promise<OAuthAuthorizationCode | null> {
    const key = this.getCodeKey(code);
    const raw = await this.redisCacheService.get(key);

    if (!raw) {
      return null;
    }

    await this.redisCacheService.remove(key);

    try {
      return JSON.parse(raw) as OAuthAuthorizationCode;
    } catch {
      return null;
    }
  }

  private getCodeKey(code: string): string {
    return `${OAuthStorageService.CODE_KEY_PREFIX}${code}`;
  }
}
