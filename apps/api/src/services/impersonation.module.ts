import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [ImpersonationService],
  exports: [ImpersonationService]
})
export class ImpersonationModule {}
