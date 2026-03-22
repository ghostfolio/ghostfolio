import { KDocumentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * DTO for confirming a verified K-1 import session.
 * Triggers auto-creation of KDocument, Distributions, and Document linkage.
 */
export class ConfirmK1Dto {
  @IsEnum(KDocumentStatus)
  filingStatus: KDocumentStatus;

  @IsOptional()
  @IsString()
  existingKDocumentAction?: 'UPDATE' | 'CREATE_NEW';
}
