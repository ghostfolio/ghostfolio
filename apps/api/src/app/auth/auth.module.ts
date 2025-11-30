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

// ANSI color codes
const colors = {
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  white: '\x1b[37m',
  yellow: '\x1b[33m'
};

function validateOidcConfiguration(
  configurationService: ConfigurationService
): void {
  const missingVariables: string[] = [];

  // Common required variables for both configurations
  const clientId = configurationService.get('OIDC_CLIENT_ID');
  const clientSecret = configurationService.get('OIDC_CLIENT_SECRET');
  const rootUrl = configurationService.get('ROOT_URL');

  if (!clientId) {
    missingVariables.push('OIDC_CLIENT_ID');
  }

  if (!clientSecret) {
    missingVariables.push('OIDC_CLIENT_SECRET');
  }

  if (!rootUrl) {
    missingVariables.push('ROOT_URL');
  }

  // Check for automatic or manual configuration
  const authorizationUrl = configurationService.get('OIDC_AUTHORIZATION_URL');
  const issuer = configurationService.get('OIDC_ISSUER');
  const tokenUrl = configurationService.get('OIDC_TOKEN_URL');
  const userInfoUrl = configurationService.get('OIDC_USER_INFO_URL');

  const hasAutomaticConfig = !!issuer;
  const hasManualConfig = authorizationUrl || tokenUrl || userInfoUrl;

  if (!hasAutomaticConfig && !hasManualConfig) {
    missingVariables.push(
      'OIDC_ISSUER (for automatic configuration) or OIDC_AUTHORIZATION_URL, OIDC_TOKEN_URL, OIDC_USER_INFO_URL (for manual configuration)'
    );
  } else if (!hasAutomaticConfig && hasManualConfig) {
    // Manual configuration: all three URLs are required
    if (!authorizationUrl) {
      missingVariables.push('OIDC_AUTHORIZATION_URL');
    }

    if (!tokenUrl) {
      missingVariables.push('OIDC_TOKEN_URL');
    }

    if (!userInfoUrl) {
      missingVariables.push('OIDC_USER_INFO_URL');
    }
  }

  if (missingVariables.length > 0) {
    const formattedVariables = missingVariables
      .map(
        (variable) =>
          `    ${colors.blue}${variable}:${colors.white} undefined${colors.reset}`
      )
      .join('\n');

    const errorMessage = `
================================
 ${colors.yellow}Missing${colors.white} OIDC environment variables:${colors.reset}
${formattedVariables}

 ${colors.white}Configuration options:${colors.reset}
   1. Automatic: Set ${colors.blue}OIDC_ISSUER${colors.reset} (endpoints discovered automatically)
   2. Manual: Set ${colors.blue}OIDC_AUTHORIZATION_URL${colors.reset}, ${colors.blue}OIDC_TOKEN_URL${colors.reset}, ${colors.blue}OIDC_USER_INFO_URL${colors.reset}

 Both options require: ${colors.blue}ROOT_URL${colors.reset}, ${colors.blue}OIDC_CLIENT_ID${colors.reset}, ${colors.blue}OIDC_CLIENT_SECRET${colors.reset}
================================
`;
    Logger.error(errorMessage, 'OidcStrategy');
    process.exit(1);
  }
}

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

        validateOidcConfiguration(configurationService);

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
