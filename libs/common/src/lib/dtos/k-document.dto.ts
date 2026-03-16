import { KDocumentStatus, KDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min
} from 'class-validator';

export class CreateKDocumentDto {
  @IsString()
  partnershipId: string;

  @IsEnum(KDocumentType)
  type: KDocumentType;

  @IsInt()
  @Min(1900)
  taxYear: number;

  @IsOptional()
  @IsEnum(KDocumentStatus)
  filingStatus?: KDocumentStatus;

  @IsObject()
  data: Record<string, number>;
}

export class UpdateKDocumentDto {
  @IsOptional()
  @IsEnum(KDocumentStatus)
  filingStatus?: KDocumentStatus;

  @IsOptional()
  @IsObject()
  data?: Record<string, number>;
}
