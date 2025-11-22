import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

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
      provide: OidcStrategy,
      useFactory: async (
        authService: AuthService,
        configurationService: ConfigurationService
      ) => {
        const issuer = configurationService.get('OIDC_ISSUER');
        const scopeString = configurationService.get('OIDC_SCOPE');
        const scope = scopeString
          .split(' ')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const options: {
          authorizationURL?: string;
          callbackURL: string;
          clientID: string;
          clientSecret: string;
          issuer?: string;
          scope: string[];
          tokenURL?: string;
          userInfoURL?: string;
        } = {
          callbackURL: `${configurationService.get(
            'ROOT_URL'
          )}/api/auth/oidc/callback`,
          clientID: configurationService.get('OIDC_CLIENT_ID'),
          clientSecret: configurationService.get('OIDC_CLIENT_SECRET'),
          scope
        };

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

            options.authorizationURL = config.authorization_endpoint;
            options.issuer = issuer;
            options.tokenURL = config.token_endpoint;
            options.userInfoURL = config.userinfo_endpoint;
          } catch (error) {
            Logger.error(error, 'OidcStrategy');
          }
        } else {
          options.authorizationURL = configurationService.get(
            'OIDC_AUTHORIZATION_URL'
          );
          options.tokenURL = configurationService.get('OIDC_TOKEN_URL');
          options.userInfoURL = configurationService.get('OIDC_USER_INFO_URL');
        }

        return new OidcStrategy(authService, options);
      },
      inject: [AuthService, ConfigurationService]
    },
    WebAuthService
  ]
})
export class AuthModule {}
