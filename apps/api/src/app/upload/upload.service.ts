import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { HttpException, Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  public constructor(private readonly prismaService: PrismaService) {
    this.uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  }

  public async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  public getUploadDir(): string {
    return this.uploadDir;
  }

  public async createDocument({
    entityId,
    file,
    name,
    partnershipId,
    taxYear,
    type
  }: {
    entityId?: string;
    file: any;
    name?: string;
    partnershipId?: string;
    taxYear?: number;
    type: DocumentType;
  }) {
    await this.ensureUploadDir();

    const now = new Date();
    const yearDir = now.getFullYear().toString();
    const monthDir = (now.getMonth() + 1).toString().padStart(2, '0');
    const subDir = join(this.uploadDir, yearDir, monthDir);

    if (!existsSync(subDir)) {
      await mkdir(subDir, { recursive: true });
    }

    // Support both disk storage (file.filename set by multer) and memory storage (file.buffer)
    let filename = file.filename;

    if (!filename) {
      const ext = (file.originalname || 'file').split('.').pop();
      filename = `${uuidv4()}.${ext}`;

      if (file.buffer) {
        await writeFile(join(subDir, filename), file.buffer);
      }
    }

    const relativePath = `/${yearDir}/${monthDir}/${filename}`;

    return this.prismaService.document.create({
      data: {
        entityId: entityId || undefined,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        name: name || file.originalname,
        partnershipId: partnershipId || undefined,
        taxYear: taxYear ? Number(taxYear) : undefined,
        type
      }
    });
  }

  public async getDocumentById(documentId: string) {
    const document = await this.prismaService.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return document;
  }

  public async getDocumentStream(documentId: string) {
    const document = await this.getDocumentById(documentId);
    const fullPath = join(this.uploadDir, document.filePath);

    if (!existsSync(fullPath)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return {
      document,
      stream: createReadStream(fullPath)
    };
  }
}
