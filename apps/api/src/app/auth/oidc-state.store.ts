import { Injectable, Logger } from '@nestjs/common';
import ms from 'ms';

/**
 * Custom state store for OIDC authentication that doesn't rely on express-session.
 * This store manages OAuth2 state parameters in memory with automatic cleanup.
 */
@Injectable()
export class OidcStateStore {
  private readonly STATE_EXPIRY_MS = ms('10 minutes');

  private stateMap = new Map<
    string,
    {
      appState?: unknown;
      ctx: { issued?: string; maxAge?: number; nonce?: string };
      linkToken?: string;
      meta?: unknown;
      timestamp: number;
    }
  >();

  /**
   * Store request state.
   * Signature matches passport-openidconnect SessionStore
   */
  public store(
    req: unknown,
    _meta: unknown,
    appState: unknown,
    ctx: { maxAge?: number; nonce?: string; issued?: string },
    callback: (err: Error | null, handle?: string) => void
  ) {
    try {
      const handle = this.generateHandle();

      const request = req as { query?: { linkToken?: string } };
      const linkToken = request?.query?.linkToken;

      this.stateMap.set(handle, {
        appState,
        ctx,
        linkToken,
        meta: _meta,
        timestamp: Date.now()
      });

      this.cleanup();

      callback(null, handle);
    } catch (error) {
      Logger.error(`Error storing OIDC state: ${error}`, 'OidcStateStore');
      callback(error as Error);
    }
  }

  /**
   * Verify request state.
   * Signature matches passport-openidconnect SessionStore
   */
  public verify(
    req: unknown,
    handle: string,
    callback: (
      err: Error | null,
      ctx?: { maxAge?: number; nonce?: string; issued?: string },
      state?: unknown
    ) => void
  ) {
    try {
      const data = this.stateMap.get(handle);

      if (!data) {
        return callback(null, undefined, undefined);
      }

      if (Date.now() - data.timestamp > this.STATE_EXPIRY_MS) {
        this.stateMap.delete(handle);
        return callback(null, undefined, undefined);
      }

      this.stateMap.delete(handle);

      if (data.linkToken) {
        (req as any).oidcLinkToken = data.linkToken;
      }

      callback(null, data.ctx, data.appState);
    } catch (error) {
      Logger.error(`Error verifying OIDC state: ${error}`, 'OidcStateStore');
      callback(error as Error);
    }
  }

  /**
   * Clean up expired states
   */
  private cleanup() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.stateMap.entries()) {
      if (now - value.timestamp > this.STATE_EXPIRY_MS) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.stateMap.delete(key);
    }
  }

  /**
   * Generate a cryptographically secure random handle
   */
  private generateHandle() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }
}
