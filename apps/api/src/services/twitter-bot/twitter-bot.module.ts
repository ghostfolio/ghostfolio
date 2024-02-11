import { BenchmarkModule } from '@ghostfolio/api/app/benchmark/benchmark.module';
import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { TwitterBotService } from '@ghostfolio/api/services/twitter-bot/twitter-bot.service';

import { Module } from '@nestjs/common';

@Module({
  exports: [TwitterBotService],
  imports: [BenchmarkModule, ConfigurationModule, SymbolModule],
  providers: [TwitterBotService]
})
export class TwitterBotModule {}
