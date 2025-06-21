import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

@Module({
  controllers: [SitemapController],
  imports: [ConfigurationModule],
  providers: [SitemapService]
})
export class SitemapModule {}
