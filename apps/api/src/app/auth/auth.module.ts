import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';
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
      inject: [AuthService, ConfigurationService],
      provide: OidcStrategy,
      useFactory: async (
        authService: AuthService,
        configurationService: ConfigurationService
      ) => {
        const oidcEnabled = configurationService.get('OIDC_ENABLED') === 'true';

        if (!oidcEnabled) {
          return null;
        }

        // Check if we need to fetch discovery config
        const authorizationURL = configurationService.get(
          'OIDC_AUTHORIZATION_URL'
        );
        const tokenURL = configurationService.get('OIDC_TOKEN_URL');
        const userInfoURL = configurationService.get('OIDC_USER_INFO_URL');

        if (!authorizationURL || !tokenURL || !userInfoURL) {
          // Fetch discovery configuration
          try {
            const issuer = configurationService.get('OIDC_ISSUER');
            const discovery = await OidcStrategy.fetchDiscoveryConfig(issuer);

            // Temporarily set the discovered URLs in the environment
            process.env.OIDC_AUTHORIZATION_URL =
              discovery.authorization_endpoint;
            process.env.OIDC_TOKEN_URL = discovery.token_endpoint;
            process.env.OIDC_USER_INFO_URL = discovery.userinfo_endpoint;
          } catch (error) {
            console.error('Failed to fetch OIDC discovery:', error);
            return null;
          }
        }

        return new OidcStrategy(authService, configurationService);
      }
    },
    WebAuthService
  ]
})
export class AuthModule {}
