import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InfoController } from './info.controller';
import { InfoService } from './info.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    })
  ],
  controllers: [InfoController],
  providers: [ConfigurationService, InfoService, PrismaService]
})
export class InfoModule {}
