import { AiModule } from '@ghostfolio/api/app/endpoints/ai/ai.module';
import { environment } from '@ghostfolio/api/environments/environment';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_ENDPOINT } from '@ghostfolio/common/config';

import { Module } from '@nestjs/common';
import {
  MCP_STRATEGY,
  McpStrategy,
  StreamableHttpTransport
} from '@rekog/mcp-nest';

import { GhostfolioMcpController } from './mcp.controller';

@Module({
  controllers: [GhostfolioMcpController],
  imports: [AiModule, ConfigurationModule],
  providers: [
    {
      inject: [ConfigurationService],
      provide: MCP_STRATEGY,
      useFactory: (configurationService: ConfigurationService) => {
        const { hostname } = new URL(configurationService.get('ROOT_URL'));

        return new McpStrategy({
          instructions:
            'Ghostfolio is a wealth management application. The tools read the portfolio of the user who granted the access. They give no monetary value.',
          name: 'ghostfolio',
          title: 'Ghostfolio',
          transports: [
            new StreamableHttpTransport({
              endpoint: MCP_ENDPOINT,
              security: {
                allowedHosts: [hostname],
                allowedOrigins: [hostname]
              }
            })
          ],
          version: environment.version,
          websiteUrl: 'https://ghostfol.io'
        });
      }
    }
  ]
})
export class McpModule {}
