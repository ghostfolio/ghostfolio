import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { MailService } from './mail.service';

@Module({
  exports: [MailService],
  imports: [ConfigurationModule],
  providers: [MailService]
})
export class MailModule {}
