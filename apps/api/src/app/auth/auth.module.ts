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
        const issuer = configurationService.get('OIDC_ISSUER');
        const scope = configurationService.get('OIDC_SCOPE');

        const callbackUrl =
          configurationService.get('OIDC_CALLBACK_URL') ||
          `${configurationService.get('ROOT_URL')}/api/auth/oidc/callback`;

        let options: StrategyOptions;

        if (issuer) {
          try {
            const response = await fetch(
              `${issuer}/.well-known/openid-configuration`
            );

            const config = (await response.json()) as {
              authorization_endpoint: string;
              token_endpoint: string;
              userinfo_endpoint: string;
            };

            options = {
              issuer,
              scope,
              authorizationURL: config.authorization_endpoint,
              callbackURL: callbackUrl,
              clientID: configurationService.get('OIDC_CLIENT_ID'),
              clientSecret: configurationService.get('OIDC_CLIENT_SECRET'),
              tokenURL: config.token_endpoint,
              userInfoURL: config.userinfo_endpoint
            };
          } catch (error) {
            Logger.error(error, 'OidcStrategy');
            throw new Error('Failed to fetch OIDC configuration from issuer');
          }
        } else {
          options = {
            scope,
            authorizationURL: configurationService.get(
              'OIDC_AUTHORIZATION_URL'
            ),
            callbackURL: callbackUrl,
            clientID: configurationService.get('OIDC_CLIENT_ID'),
            clientSecret: configurationService.get('OIDC_CLIENT_SECRET'),
            issuer: configurationService.get('OIDC_ISSUER'),
            tokenURL: configurationService.get('OIDC_TOKEN_URL'),
            userInfoURL: configurationService.get('OIDC_USER_INFO_URL')
          };
        }

        return new OidcStrategy(authService, options);
      }
    },
    WebAuthService
  ]
})
export class AuthModule {}
