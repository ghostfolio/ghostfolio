import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Module({
  controllers: [UploadController],
  exports: [UploadService],
  imports: [
    MulterModule.register({
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10)
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const now = new Date();
          const yearDir = now.getFullYear().toString();
          const monthDir = (now.getMonth() + 1).toString().padStart(2, '0');
          const subDir = join(uploadDir, yearDir, monthDir);

          if (!existsSync(subDir)) {
            mkdirSync(subDir, { recursive: true });
          }

          cb(null, subDir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, ext ? `${uuidv4()}${ext}` : uuidv4());
        }
      })
    }),
    PrismaModule
  ],
  providers: [UploadService]
})
export class UploadModule {}
