import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { TwitterBotService } from '@ghostfolio/api/services/twitter-bot/twitter-bot.service';
import { Module } from '@nestjs/common';

@Module({
  exports: [TwitterBotService],
  imports: [ConfigurationModule, SymbolModule],
  providers: [TwitterBotService]
})
export class TwitterBotModule {}
