import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiKeyModule } from '@ghostfolio/api/services/api-key/api-key.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { McpAuthService } from './mcp-auth.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpTokenService } from './oauth/mcp-token.service';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';

@Module({
  controllers: [McpController, OAuthController],
  imports: [
    ApiKeyModule,
    ConfigurationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY
    }),
    UserModule
  ],
  providers: [McpAuthService, McpService, McpTokenService, OAuthService]
})
export class McpModule {}
