import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { UserModule as UserServiceModule } from '@ghostfolio/api/services/user/user.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  imports: [
    ConfigurationModule,
    ImpersonationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    PrismaModule,
    PropertyModule,
    RedactValuesInResponseModule,
    TransformDataSourceInResponseModule,
    UserServiceModule
  ]
})
export class UserModule {}
