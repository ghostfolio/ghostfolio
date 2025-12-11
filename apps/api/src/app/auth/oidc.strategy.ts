import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Request } from 'express';
import { Strategy, type StrategyOptions } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import {
  OidcContext,
  OidcIdToken,
  OidcParams,
  OidcProfile
} from './interfaces/interfaces';
import { OidcLinkState, OidcStateStore } from './oidc-state.store';

export interface OidcValidationResult {
  jwt?: string;
  linkState?: OidcLinkState;
  thirdPartyId: string;
}

export interface OidcStrategyOptions extends StrategyOptions {
  jwtSecret?: string;
}

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  private static readonly stateStore = new OidcStateStore();

  public static getStateStore(): OidcStateStore {
    return OidcStrategy.stateStore;
  }

  public constructor(
    private readonly authService: AuthService,
    options: OidcStrategyOptions
  ) {
    super({
      ...options,
      passReqToCallback: true,
      store: OidcStrategy.stateStore
    });

    // Configure JWT secret for link mode validation
    if (options.jwtSecret) {
      OidcStrategy.stateStore.setJwtSecret(options.jwtSecret);
      Logger.debug('JWT secret configured for OIDC link mode', 'OidcStrategy');
    }
  }

  public async validate(
    request: Request,
    issuer: string,
    profile: OidcProfile,
    context: OidcContext,
    idToken: OidcIdToken,
    _accessToken: string,
    _refreshToken: string,
    params: OidcParams
  ) {
    try {
      const thirdPartyId =
        profile?.id ??
        profile?.sub ??
        idToken?.sub ??
        params?.sub ??
        context?.claims?.sub;

      if (!thirdPartyId) {
        Logger.error(
          `Missing subject identifier in OIDC response from ${issuer}`,
          'OidcStrategy'
        );

        throw new Error('Missing subject identifier in OIDC response');
      }

      // Check if this is a link mode request
      // The linkState is attached to the request by OidcStateStore.verify()
      const linkState = (request as any).oidcLinkState as
        | OidcLinkState
        | undefined;

      if (linkState?.linkMode) {
        Logger.log(
          `OidcStrategy: Link mode detected for user ${linkState.userId.substring(0, 8)}...`,
          'OidcStrategy'
        );

        // In link mode, we don't validate OAuth login (which would create a new user)
        // Instead, we return the thirdPartyId for the controller to link
        return {
          linkState,
          thirdPartyId
        } as OidcValidationResult;
      }

      // Normal OIDC login flow
      Logger.debug(
        `OidcStrategy: Normal login flow for thirdPartyId ${thirdPartyId.substring(0, 8)}...`,
        'OidcStrategy'
      );

      const jwt = await this.authService.validateOAuthLogin({
        thirdPartyId,
        provider: Provider.OIDC
      });

      return { jwt, thirdPartyId } as OidcValidationResult;
    } catch (error) {
      Logger.error(error, 'OidcStrategy');
      throw error;
    }
  }
}
