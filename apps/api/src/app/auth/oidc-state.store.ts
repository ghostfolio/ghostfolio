import type { Request } from 'express';
import ms from 'ms';
import { randomBytes } from 'node:crypto';  // ADD THIS LINE
import type {
  SessionStore,
  SessionStoreCallback,
  SessionStoreContext,
  SessionVerifyCallback
} from 'passport-openidconnect';

/**
 * Custom state store for OIDC authentication that doesn't rely on express-session.
 * This store manages OAuth2 state parameters in memory with automatic cleanup.
 */
export class OidcStateStore implements SessionStore {
  private readonly STATE_EXPIRY_MS = ms('10 minutes');

  private stateMap = new Map<
    string,
    {
      appState?: unknown;
      ctx: SessionStoreContext;
      meta?: unknown;
      timestamp: number;
    }
  >();

  /**
   * Store request state.
   */
  public store(
    _req: Request,
    ctx: SessionStoreContext,
    appState: unknown,
    meta: unknown,
    callback: SessionStoreCallback
  ) {
    try {
      // Generate a unique handle for this state
      const handle = this.generateHandle();

      this.stateMap.set(handle, {
        appState,
        ctx,
        meta,
        timestamp: Date.now()
      });

      // Clean up expired states
      this.cleanup();

      callback(null, handle);
    } catch (error) {
      callback(error as Error);
    }
  }

  /**
   * Verify request state.
   */
  public verify(
    _req: Request,
    handle: string,
    callback: SessionVerifyCallback
  ) {
    try {
      const data = this.stateMap.get(handle);

      if (!data) {
  return callback(
    new Error('Invalid OIDC state parameter'),
    undefined,
    undefined
  );
}

if (Date.now() - data.timestamp > this.STATE_EXPIRY_MS) {
  this.stateMap.delete(handle);
  return callback(
    new Error('OIDC state has expired, please try again'),
    undefined,
    undefined
  );
}

      // Remove state after verification (one-time use)
      this.stateMap.delete(handle);

      callback(null, data.ctx, data.appState);
    } catch (error) {
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
  return randomBytes(32).toString('hex');
}
}
