import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf
} from 'class-validator';
import { isString } from 'lodash';

export class UpdateAccountDto {
  /**
   * The balance, stored as the account balance of today.
   * Optional because the account balances are the source of truth.
   */
  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string | null;

  @IsCurrencyCode()
  currency: string;

  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((_object, value) => value !== null)
  platformId: string | null;

  @ArrayUnique()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
