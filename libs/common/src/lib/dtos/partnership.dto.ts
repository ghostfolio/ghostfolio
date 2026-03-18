import {
  FamilyOfficeAssetType,
  PartnershipType,
  ValuationSource
} from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { isString } from 'lodash';

export class CreatePartnershipDto {
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  name: string;

  @IsEnum(PartnershipType)
  type: PartnershipType;

  @IsISO8601()
  inceptionDate: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEnd?: number;

  @IsString()
  currency: string;
}

export class UpdatePartnershipDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEnd?: number;
}

export class CreatePartnershipMembershipDto {
  @IsString()
  entityId: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  ownershipPercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capitalCommitment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capitalContributed?: number;

  @IsOptional()
  @IsString()
  classType?: string;

  @IsISO8601()
  effectiveDate: string;
}

export class CreatePartnershipValuationDto {
  @IsISO8601()
  date: string;

  @IsNumber()
  @Min(0)
  nav: number;

  @IsEnum(ValuationSource)
  source: ValuationSource;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePartnershipAssetDto {
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  name: string;

  @IsEnum(FamilyOfficeAssetType)
  assetType: FamilyOfficeAssetType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
