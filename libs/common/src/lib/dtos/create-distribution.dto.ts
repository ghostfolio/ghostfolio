import { DistributionType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { isString } from 'lodash';

export class CreateDistributionDto {
  @IsOptional()
  @IsString()
  partnershipId?: string;

  @IsString()
  entityId: string;

  @IsEnum(DistributionType)
  type: DistributionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsISO8601()
  date: string;

  @IsString()
  currency: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxWithheld?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  notes?: string;
}
