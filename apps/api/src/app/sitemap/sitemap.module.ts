import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { SitemapController } from './sitemap.controller';

@Module({
  controllers: [SitemapController],
  imports: [ConfigurationModule]
})
export class SitemapModule {}
