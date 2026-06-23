import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import {
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  accountId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsCurrencyCode()
  currency: string;

  @IsISO8601()
  date: string;

  @IsString()
  @IsOptional()
  merchant?: string;

  @IsArray()
  @IsOptional()
  tagIds?: string[];
}
