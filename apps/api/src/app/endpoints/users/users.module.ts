import { AdminModule } from '@ghostfolio/api/app/admin/admin.module';
import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { UserModule } from '@ghostfolio/api/services/user/user.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserController } from './user.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [UserController, UsersController],
  imports: [
    AdminModule,
    ConfigurationModule,
    ImpersonationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    PropertyModule,
    RedactValuesInResponseModule,
    TransformDataSourceInResponseModule,
    UserModule
  ]
})
export class UsersModule {}
