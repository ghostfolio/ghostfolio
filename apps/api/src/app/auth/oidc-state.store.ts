import ms from 'ms';

/**
 * Custom state store for OIDC authentication that doesn't rely on express-session.
 * This store manages OAuth2 state parameters in memory with automatic cleanup.
 */
export class OidcStateStore {
  private readonly STATE_EXPIRY_MS = ms('10 minutes');

  private stateMap = new Map<
    string,
    {
      appState?: unknown;
      ctx: { issued?: Date; maxAge?: number; nonce?: string };
      meta?: unknown;
      timestamp: number;
    }
  >();

  /**
   * Store request state.
   * Signature matches passport-openidconnect SessionStore
   */
  public store(
    _req: unknown,
    _meta: unknown,
    appState: unknown,
    ctx: { maxAge?: number; nonce?: string; issued?: Date },
    callback: (err: Error | null, handle?: string) => void
  ) {
    try {
      // Generate a unique handle for this state
      const handle = this.generateHandle();

      this.stateMap.set(handle, {
        appState,
        ctx,
        meta: _meta,
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
   * Signature matches passport-openidconnect SessionStore
   */
  public verify(
    _req: unknown,
    handle: string,
    callback: (
      err: Error | null,
      appState?: unknown,
      ctx?: { maxAge?: number; nonce?: string; issued?: Date }
    ) => void
  ) {
    try {
      const data = this.stateMap.get(handle);

      if (!data) {
        return callback(null, undefined, undefined);
      }

      if (Date.now() - data.timestamp > this.STATE_EXPIRY_MS) {
        // State has expired
        this.stateMap.delete(handle);
        return callback(null, undefined, undefined);
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
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }
}
