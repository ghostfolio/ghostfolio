import { KDocumentStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateK1ImportDto {
  @IsString()
  partnershipId: string;

  @IsInt()
  @Min(1900)
  taxYear: number;
}

export class K1ExtractedFieldDto {
  @IsString()
  boxNumber: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  customLabel?: string;

  @IsString()
  rawValue: string;

  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @IsNumber()
  confidence: number;

  @IsString()
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsBoolean()
  isUserEdited: boolean;

  @IsBoolean()
  isReviewed: boolean;

  @IsOptional()
  @IsString()
  cellType?: string;

  @IsOptional()
  @IsString()
  subtype?: string | null;

  @IsOptional()
  @IsString()
  fieldCategory?: string;

  @IsOptional()
  @IsBoolean()
  isCheckbox?: boolean;
}

export class K1UnmappedItemDto {
  @IsString()
  rawLabel: string;

  @IsString()
  rawValue: string;

  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @IsNumber()
  confidence: number;

  @IsInt()
  pageNumber: number;

  @IsString()
  resolution: 'assigned' | 'discarded';

  @IsOptional()
  @IsString()
  assignedBoxNumber?: string;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsString()
  fontName?: string;
}

export class VerifyK1ImportDto {
  @IsInt()
  @Min(1900)
  taxYear: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => K1ExtractedFieldDto)
  fields: K1ExtractedFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => K1UnmappedItemDto)
  unmappedItems?: K1UnmappedItemDto[];
}

export class ConfirmK1ImportDto {
  @IsEnum(KDocumentStatus)
  filingStatus: KDocumentStatus;

  @IsOptional()
  @IsString()
  existingKDocumentAction?: 'UPDATE' | 'CREATE_NEW';
}
