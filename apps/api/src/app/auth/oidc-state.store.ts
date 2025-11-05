/**
 * Custom state store for OIDC authentication that doesn't rely on express-session.
 * This store manages OAuth2 state parameters in memory with automatic cleanup.
 */
export class OidcStateStore {
  private stateMap = new Map<
    string,
    {
      ctx: { maxAge?: number; nonce?: string; issued?: Date };
      appState?: unknown;
      meta?: unknown;
      timestamp: number;
    }
  >();
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Store request state.
   * Signature matches passport-openidconnect SessionStore
   */
  public store(
    _req: unknown,
    ctx: { maxAge?: number; nonce?: string; issued?: Date },
    appState: unknown,
    _meta: unknown,
    callback: (err: Error | null, handle?: string) => void
  ): void {
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
      ctx?: { maxAge?: number; nonce?: string; issued?: Date },
      appState?: unknown
    ) => void
  ): void {
    try {
      const data = this.stateMap.get(handle);

      if (!data) {
        return callback(null, undefined, undefined);
      }

      // Check if state has expired
      if (Date.now() - data.timestamp > this.STATE_EXPIRY_MS) {
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
   * Generate a cryptographically secure random handle
   */
  private generateHandle(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }

  /**
   * Clean up expired states
   */
  private cleanup(): void {
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
}
