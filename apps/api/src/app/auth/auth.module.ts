import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StrategyOptions } from 'passport-openidconnect';

import { ApiKeyStrategy } from './api-key.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { OidcStrategy } from './oidc.strategy';

@Module({
  controllers: [AuthController],
  imports: [
    ConfigurationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '180 days' }
    }),
    PrismaModule,
    PropertyModule,
    SubscriptionModule,
    UserModule
  ],
  providers: [
    ApiKeyService,
    ApiKeyStrategy,
    AuthDeviceService,
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    {
      inject: [AuthService, ConfigurationService],
      provide: OidcStrategy,
      useFactory: async (
        authService: AuthService,
        configurationService: ConfigurationService
      ) => {
        const isOidcEnabled = configurationService.get(
          'ENABLE_FEATURE_AUTH_OIDC'
        );

        if (!isOidcEnabled) {
          return null;
        }

        const issuer = configurationService.get('OIDC_ISSUER');
        const scope = configurationService.get('OIDC_SCOPE');

        const callbackUrl =
          configurationService.get('OIDC_CALLBACK_URL') ||
          `${configurationService.get('ROOT_URL')}/api/auth/oidc/callback`;

        // Check for manual URL overrides
        const manualAuthorizationUrl = configurationService.get(
          'OIDC_AUTHORIZATION_URL'
        );
        const manualTokenUrl = configurationService.get('OIDC_TOKEN_URL');
        const manualUserInfoUrl =
          configurationService.get('OIDC_USER_INFO_URL');

        let authorizationURL: string;
        let tokenURL: string;
        let userInfoURL: string;

        if (manualAuthorizationUrl && manualTokenUrl && manualUserInfoUrl) {
          // Use manual URLs
          authorizationURL = manualAuthorizationUrl;
          tokenURL = manualTokenUrl;
          userInfoURL = manualUserInfoUrl;
        } else {
          // Fetch OIDC configuration from discovery endpoint
          try {
            const response = await fetch(
              `${issuer}/.well-known/openid-configuration`
            );

            const config = (await response.json()) as {
              authorization_endpoint: string;
              token_endpoint: string;
              userinfo_endpoint: string;
            };

            // Manual URLs take priority over discovered ones
            authorizationURL =
              manualAuthorizationUrl || config.authorization_endpoint;
            tokenURL = manualTokenUrl || config.token_endpoint;
            userInfoURL = manualUserInfoUrl || config.userinfo_endpoint;
          } catch (error) {
            Logger.error(error, 'OidcStrategy');
            throw new Error('Failed to fetch OIDC configuration from issuer');
          }
        }

        const options: StrategyOptions = {
          authorizationURL,
          issuer,
          scope,
          tokenURL,
          userInfoURL,
          callbackURL: callbackUrl,
          clientID: configurationService.get('OIDC_CLIENT_ID'),
          clientSecret: configurationService.get('OIDC_CLIENT_SECRET')
        };

        return new OidcStrategy(authService, options);
      }
    },
    WebAuthService
  ]
})
export class AuthModule {}
