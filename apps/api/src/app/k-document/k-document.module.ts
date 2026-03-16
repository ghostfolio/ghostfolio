import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { UploadModule } from '../upload/upload.module';
import { KDocumentController } from './k-document.controller';
import { KDocumentService } from './k-document.service';

@Module({
  controllers: [KDocumentController],
  exports: [KDocumentService],
  imports: [PrismaModule, UploadModule],
  providers: [KDocumentService]
})
export class KDocumentModule {}
