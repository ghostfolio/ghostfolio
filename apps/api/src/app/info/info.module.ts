import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConfigurationService } from '../../services/configuration.service';
import { PrismaService } from '../../services/prisma.service';
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
