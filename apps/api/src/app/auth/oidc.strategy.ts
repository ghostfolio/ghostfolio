import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Strategy } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import { OidcStateStore } from './oidc-state.store';

interface OidcDiscovery {
  authorization_endpoint: string;
  issuer: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  private static readonly logger = new Logger(OidcStrategy.name);
  private static readonly stateStore = new OidcStateStore();

  public constructor(
    private readonly authService: AuthService,
    configurationService: ConfigurationService
  ) {
    const issuer = configurationService.get('OIDC_ISSUER');
    const clientID = configurationService.get('OIDC_CLIENT_ID');
    const clientSecret = configurationService.get('OIDC_CLIENT_SECRET');
    const callbackURL =
      configurationService.get('OIDC_CALLBACK_URL') ||
      `${configurationService.get('ROOT_URL')}/api/auth/oidc/callback`;

    const scope =
      configurationService.get('OIDC_SCOPE') || 'openid profile email';

    // Use explicit URLs if provided
    const authorizationURL = configurationService.get('OIDC_AUTHORIZATION_URL');
    const tokenURL = configurationService.get('OIDC_TOKEN_URL');
    const userInfoURL = configurationService.get('OIDC_USER_INFO_URL');

    const strategyConfig: any = {
      authorizationURL: authorizationURL || `${issuer}authorize/`,
      callbackURL,
      clientID,
      clientSecret,
      issuer,
      passReqToCallback: true,
      scope: scope.split(' '),
      store: OidcStrategy.stateStore,
      tokenURL: tokenURL || `${issuer}token/`,
      userInfoURL: userInfoURL || `${issuer}userinfo/`
    };

    OidcStrategy.logger.log(
      `OIDC authentication configured with issuer: ${issuer}`
    );

    super(strategyConfig);
  }

  /**
   * Static method to fetch OIDC discovery configuration
   */
  public static async fetchDiscoveryConfig(
    issuer: string
  ): Promise<OidcDiscovery> {
    const discoveryUrl = `${issuer}.well-known/openid-configuration`;

    OidcStrategy.logger.log(
      `Fetching OIDC configuration from: ${discoveryUrl}`
    );

    const response = await fetch(discoveryUrl);
    const discovery = (await response.json()) as OidcDiscovery;

    OidcStrategy.logger.log(
      `OIDC discovery successful. Authorization endpoint: ${discovery.authorization_endpoint}`
    );

    return discovery;
  }

  public async validate(
    _request: any,
    _issuer: string,
    profile: any,
    context: any,
    idToken: any,
    _accessToken: any,
    _refreshToken: any,
    params: any
  ) {
    // El 'sub' (subject) del ID Token es el identificador único estándar de OIDC
    // Según OpenID Connect Core 1.0, el 'sub' es el identificador único e inmutable del usuario
    // El 'sub' viene en el idToken parseado o en params
    const thirdPartyId =
      params?.sub || idToken?.sub || context?.claims?.sub || profile?.id;

    if (!thirdPartyId) {
      OidcStrategy.logger.error(
        'No subject (sub) found in OIDC token or profile',
        { context, idToken, params, profile }
      );
      throw new Error('Missing subject identifier in OIDC response');
    }

    OidcStrategy.logger.debug(
      `Validating OIDC user with subject: ${thirdPartyId}`
    );

    const jwt = await this.authService.validateOAuthLogin({
      provider: Provider.OIDC,
      thirdPartyId
    });

    OidcStrategy.logger.log(
      `Successfully authenticated OIDC user: ${thirdPartyId}`
    );

    return { jwt };
  }
}
