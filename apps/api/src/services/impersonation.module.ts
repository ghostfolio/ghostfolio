import { Module } from '@nestjs/common';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ImpersonationService],
  exports: [ImpersonationService]
})
export class ImpersonationModule {}
