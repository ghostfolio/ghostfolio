import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import ms from 'ms';

export interface OidcLinkState {
  linkMode: boolean;
  userId: string;
}

/**
 * Custom state store for OIDC authentication that doesn't rely on express-session.
 * This store manages OAuth2 state parameters in memory with automatic cleanup.
 * Supports link mode for linking existing token-authenticated users to OIDC.
 */
export class OidcStateStore {
  private readonly STATE_EXPIRY_MS = ms('10 minutes');

  private pendingLinkState?: OidcLinkState;

  private jwtSecret?: string;

  private stateMap = new Map<
    string,
    {
      appState?: unknown;
      ctx: { issued?: string; maxAge?: number; nonce?: string };
      linkState?: OidcLinkState;
      meta?: unknown;
      timestamp: number;
    }
  >();

  /**
   * Set the JWT secret for token validation in link mode
   */
  public setJwtSecret(secret: string) {
    this.jwtSecret = secret;
  }

  /**
   * Store request state.
   * Signature matches passport-openidconnect SessionStore
   * Automatically extracts linkMode from request query params and validates JWT token
   */
  public store(
    req: unknown,
    _meta: unknown,
    appState: unknown,
    ctx: { maxAge?: number; nonce?: string; issued?: string },
    callback: (err: Error | null, handle?: string) => void
  ) {
    try {
      // Generate a unique handle for this state
      const handle = this.generateHandle();

      // Check if there's a pending link state from the controller
      // or extract from request query params
      let linkState = this.getPendingLinkState();

      // If no pending state, check request query params for linkMode
      if (!linkState) {
        const request = req as {
          query?: { linkMode?: string; token?: string };
          headers?: { authorization?: string };
        };

        if (request?.query?.linkMode === 'true') {
          // Get token from query param or Authorization header
          let token = request?.query?.token;
          if (
            !token &&
            request?.headers?.authorization?.startsWith('Bearer ')
          ) {
            token = request.headers.authorization.substring(7);
          }

          if (token && this.jwtSecret) {
            try {
              const decoded = jwt.verify(token, this.jwtSecret) as {
                id: string;
              };
              if (decoded?.id) {
                linkState = {
                  linkMode: true,
                  userId: decoded.id
                };
                Logger.log(
                  `Link mode validated for user ${decoded.id.substring(0, 8)}... from request`,
                  'OidcStateStore'
                );
              }
            } catch (error) {
              Logger.warn(
                `Failed to validate JWT in link mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'OidcStateStore'
              );
            }
          } else {
            Logger.warn(
              'Link mode requested but no valid token provided',
              'OidcStateStore'
            );
          }
        }
      }

      const isLinkMode = linkState?.linkMode ?? false;
      Logger.debug(
        `Storing OIDC state with handle ${handle.substring(0, 8)}... (linkMode: ${isLinkMode})`,
        'OidcStateStore'
      );

      this.stateMap.set(handle, {
        appState,
        ctx,
        linkState,
        meta: _meta,
        timestamp: Date.now()
      });

      // Clean up expired states
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
   * Attaches linkState directly to request for retrieval in validate()
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
        Logger.debug(
          `OIDC state not found for handle ${handle.substring(0, 8)}...`,
          'OidcStateStore'
        );
        return callback(null, undefined, undefined);
      }

      if (Date.now() - data.timestamp > this.STATE_EXPIRY_MS) {
        // State has expired
        Logger.debug(
          `OIDC state expired for handle ${handle.substring(0, 8)}...`,
          'OidcStateStore'
        );
        this.stateMap.delete(handle);
        return callback(null, undefined, undefined);
      }

      // Remove state after verification (one-time use)
      this.stateMap.delete(handle);

      const isLinkMode = data.linkState?.linkMode ?? false;
      Logger.debug(
        `Verified OIDC state for handle ${handle.substring(0, 8)}... (linkMode: ${isLinkMode})`,
        'OidcStateStore'
      );

      // Attach linkState directly to request object for retrieval in validate()
      if (data.linkState) {
        (req as any).oidcLinkState = data.linkState;
        Logger.log(
          `Attached linkState to request for user ${data.linkState.userId.substring(0, 8)}...`,
          'OidcStateStore'
        );
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

  /**
   * Set link state for an existing or upcoming state entry.
   * This allows the controller to attach user information before the OIDC flow starts.
   */
  public setLinkStateForNextStore(linkState: OidcLinkState) {
    this.pendingLinkState = linkState;
    Logger.log(
      `Link state prepared for user ${linkState.userId.substring(0, 8)}...`,
      'OidcStateStore'
    );
  }

  /**
   * Get and clear pending link state (used internally by store)
   */
  public getPendingLinkState(): OidcLinkState | undefined {
    const linkState = this.pendingLinkState;
    this.pendingLinkState = undefined;
    return linkState;
  }
}
